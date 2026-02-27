import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { authenticateToken } from '../middleware/auth';
import { authenticateWithPermissions } from '../middleware/permissions';
import { AuthenticatedRequest, AuthenticatedRequestWithPermissions, SubAdmin, Permission, AdminPage } from '../types';

const router = Router();

const ADMIN_CONFIG_DOC = 'config';
const ADMIN_COLLECTION = 'adminConfig';
const SUB_ADMINS_COLLECTION = 'subAdmins';

// The only allowed admin email - hardcoded for security
const ALLOWED_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mjabdullah33@gmail.com';

// GET /api/admin/status - Check if admin is configured (public)
router.get('/status', async (req, res: Response) => {
  try {
    const configDoc = await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).get();
    
    res.json({
      success: true,
      data: {
        isConfigured: configDoc.exists,
        // Only show masked email for security
        adminEmail: maskEmail(ALLOWED_ADMIN_EMAIL),
      },
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check admin status',
    });
  }
});

// GET /api/admin/verify - Verify if current user is admin or sub-admin (authenticated)
router.get('/verify', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Get user details from Firebase Auth
    const userRecord = await auth.getUser(user.uid);
    const userEmail = userRecord.email?.toLowerCase() || '';
    const allowedEmail = ALLOWED_ADMIN_EMAIL.toLowerCase();
    
    // Check if user is the core admin
    const isCoreAdmin = userEmail === allowedEmail;
    
    if (isCoreAdmin) {
      // User is the core admin - update or create admin config
      const configDoc = await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).get();
      
      if (!configDoc.exists) {
        await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).set({
          adminUid: user.uid,
          adminEmail: userRecord.email,
          adminName: userRecord.displayName || null,
          adminPhoto: userRecord.photoURL || null,
          provider: userRecord.providerData[0]?.providerId || 'unknown',
          registeredAt: new Date(),
          lastLoginAt: new Date(),
        });
      } else {
        await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).update({
          lastLoginAt: new Date(),
          adminUid: user.uid,
          adminName: userRecord.displayName || configDoc.data()?.adminName,
          adminPhoto: userRecord.photoURL || configDoc.data()?.adminPhoto,
        });
      }

      const allPermissions: Permission[] = ['VIEW', 'CREATE', 'UPDATE', 'DELETE'];
      const adminPages: AdminPage[] = ['dashboard', 'profile', 'about', 'skills', 'projects', 'education', 'experience', 'faqs', 'messages'];

      res.json({
        success: true,
        data: {
          isAdmin: true,
          isCoreAdmin: true,
          isSubAdmin: false,
          adminEmail: userRecord.email,
          adminName: userRecord.displayName,
          pagePermissions: adminPages.map(page => ({
            page,
            permissions: allPermissions,
          })),
          canAccessTeamManagement: true,
          canAccessRequests: true,
        },
      });
      return;
    }

    // Check if user is a sub-admin
    const subAdminSnapshot = await db.collection(SUB_ADMINS_COLLECTION)
      .where('email', '==', userEmail)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!subAdminSnapshot.empty) {
      const subAdminDoc = subAdminSnapshot.docs[0];
      const subAdmin = { id: subAdminDoc.id, ...subAdminDoc.data() } as SubAdmin;

      // Update last login and user info
      await subAdminDoc.ref.update({
        lastLoginAt: new Date(),
        name: userRecord.displayName || subAdmin.name,
        photoUrl: userRecord.photoURL || subAdmin.photoUrl,
        uid: user.uid,
      });

      res.json({
        success: true,
        data: {
          isAdmin: true,
          isCoreAdmin: false,
          isSubAdmin: true,
          subAdminId: subAdmin.id,
          adminEmail: userRecord.email,
          adminName: userRecord.displayName || subAdmin.name,
          pagePermissions: subAdmin.pagePermissions,
          canAccessTeamManagement: false,
          canAccessRequests: false,
        },
      });
      return;
    }

    // User is neither core admin nor sub-admin
    res.status(403).json({
      success: false,
      error: 'Access denied. You are not authorized to access the admin panel.',
      data: {
        isAdmin: false,
        canRegister: false,
      },
    });
  } catch (error) {
    console.error('Error verifying admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify admin status',
    });
  }
});

// POST /api/admin/register - No longer needed but kept for compatibility
router.post('/register', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Get user details from Firebase Auth
    const userRecord = await auth.getUser(user.uid);
    const userEmail = userRecord.email?.toLowerCase();
    const allowedEmail = ALLOWED_ADMIN_EMAIL.toLowerCase();
    
    // Check if user's email matches the allowed admin email
    if (userEmail !== allowedEmail) {
      res.status(403).json({
        success: false,
        error: 'Access denied. Only the authorized admin email can register.',
      });
      return;
    }

    // Register/update admin
    await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).set({
      adminUid: user.uid,
      adminEmail: userRecord.email,
      adminName: userRecord.displayName || null,
      adminPhoto: userRecord.photoURL || null,
      provider: userRecord.providerData[0]?.providerId || 'unknown',
      registeredAt: new Date(),
      lastLoginAt: new Date(),
    }, { merge: true });

    res.json({
      success: true,
      data: {
        isAdmin: true,
        message: 'Admin registered successfully',
      },
    });
  } catch (error) {
    console.error('Error registering admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register admin',
    });
  }
});

// Helper function to mask email
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}${localPart[1]}***@${domain}`;
}

export default router;
