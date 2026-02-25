import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

const ADMIN_CONFIG_DOC = 'config';
const ADMIN_COLLECTION = 'adminConfig';

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

// GET /api/admin/verify - Verify if current user is admin (authenticated)
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
    const userEmail = userRecord.email?.toLowerCase();
    const allowedEmail = ALLOWED_ADMIN_EMAIL.toLowerCase();
    
    // Check if user's email matches the allowed admin email
    const isAdmin = userEmail === allowedEmail;
    
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Access denied. You are not the authorized admin.',
        data: {
          isAdmin: false,
          canRegister: false,
        },
      });
      return;
    }

    // User is the admin - update or create admin config
    const configDoc = await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).get();
    
    if (!configDoc.exists) {
      // Auto-register this admin
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
      // Update last login
      await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).update({
        lastLoginAt: new Date(),
        adminUid: user.uid, // Update UID in case it changed (e.g., different provider)
        adminName: userRecord.displayName || configDoc.data()?.adminName,
        adminPhoto: userRecord.photoURL || configDoc.data()?.adminPhoto,
      });
    }

    res.json({
      success: true,
      data: {
        isAdmin: true,
        adminEmail: userRecord.email,
        adminName: userRecord.displayName,
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
