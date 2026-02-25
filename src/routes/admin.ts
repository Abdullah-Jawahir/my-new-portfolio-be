import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';

const router = Router();

const ADMIN_CONFIG_DOC = 'config';
const ADMIN_COLLECTION = 'adminConfig';

// GET /api/admin/status - Check if admin is configured (public)
router.get('/status', async (req, res: Response) => {
  try {
    const configDoc = await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).get();
    
    if (!configDoc.exists) {
      res.json({
        success: true,
        data: {
          isConfigured: false,
          message: 'No admin configured yet. First Google sign-in will become admin.',
        },
      });
      return;
    }

    const config = configDoc.data();
    res.json({
      success: true,
      data: {
        isConfigured: true,
        adminEmail: config?.adminEmail ? maskEmail(config.adminEmail) : null,
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

// POST /api/admin/register - Register as admin (first Google sign-in only)
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

    // Check if admin is already configured
    const configDoc = await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).get();
    
    if (configDoc.exists) {
      const config = configDoc.data();
      
      // Check if this user is the admin
      if (config?.adminUid === user.uid) {
        res.json({
          success: true,
          data: {
            isAdmin: true,
            message: 'You are already the admin',
          },
        });
        return;
      }
      
      // Someone else is already admin
      res.status(403).json({
        success: false,
        error: 'Admin already configured. Access denied.',
      });
      return;
    }

    // Get user details from Firebase Auth
    const userRecord = await auth.getUser(user.uid);
    
    // Register this user as admin
    await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).set({
      adminUid: user.uid,
      adminEmail: userRecord.email,
      adminName: userRecord.displayName || null,
      adminPhoto: userRecord.photoURL || null,
      provider: userRecord.providerData[0]?.providerId || 'unknown',
      registeredAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      data: {
        isAdmin: true,
        message: 'You have been registered as the admin',
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

    const configDoc = await db.collection(ADMIN_COLLECTION).doc(ADMIN_CONFIG_DOC).get();
    
    if (!configDoc.exists) {
      // No admin configured yet - this user can become admin
      res.json({
        success: true,
        data: {
          isAdmin: false,
          canRegister: true,
          message: 'No admin configured. You can register as admin.',
        },
      });
      return;
    }

    const config = configDoc.data();
    const isAdmin = config?.adminUid === user.uid;
    
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

    res.json({
      success: true,
      data: {
        isAdmin: true,
        adminEmail: config?.adminEmail,
        adminName: config?.adminName,
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

// Helper function to mask email
function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}${localPart[1]}***@${domain}`;
}

export default router;
