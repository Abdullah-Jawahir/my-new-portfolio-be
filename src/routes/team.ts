import { Router, Response } from 'express';
import { db, auth } from '../config/firebase';
import { authenticateWithPermissions, requireCoreAdmin } from '../middleware/permissions';
import { authenticateToken } from '../middleware/auth';
import { 
  AuthenticatedRequestWithPermissions, 
  AuthenticatedRequest,
  SubAdminInvitation, 
  SubAdmin,
  PagePermission,
  AdminPage,
  Permission 
} from '../types';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

const INVITATIONS_COLLECTION = 'adminInvitations';
const SUB_ADMINS_COLLECTION = 'subAdmins';

const DEFAULT_VIEW_PERMISSIONS: PagePermission[] = [
  { page: 'dashboard', permissions: ['VIEW'] },
  { page: 'profile', permissions: ['VIEW'] },
  { page: 'about', permissions: ['VIEW'] },
  { page: 'skills', permissions: ['VIEW'] },
  { page: 'projects', permissions: ['VIEW'] },
  { page: 'education', permissions: ['VIEW'] },
  { page: 'experience', permissions: ['VIEW'] },
  { page: 'faqs', permissions: ['VIEW'] },
  { page: 'messages', permissions: ['VIEW'] },
];

const pagePermissionSchema = z.object({
  page: z.enum(['dashboard', 'profile', 'about', 'skills', 'projects', 'education', 'experience', 'faqs', 'messages']),
  permissions: z.array(z.enum(['VIEW', 'CREATE', 'UPDATE', 'DELETE'])),
});

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  pagePermissions: z.array(pagePermissionSchema).optional(),
});

const updatePermissionsSchema = z.object({
  pagePermissions: z.array(pagePermissionSchema),
});

const disableSchema = z.object({
  reason: z.string().optional(),
});

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getExpirationDate(days: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// GET /api/team - Get all sub-admins and pending invitations (Core Admin Only)
router.get('/', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    // Fetch all sub-admins without orderBy to avoid index requirements
    const subAdminsSnapshot = await db.collection(SUB_ADMINS_COLLECTION).get();
    
    let subAdmins: SubAdmin[] = subAdminsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      lastLoginAt: doc.data().lastLoginAt?.toDate(),
      disabledAt: doc.data().disabledAt?.toDate(),
    })) as SubAdmin[];

    // Sort by createdAt descending (client-side)
    subAdmins.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Fetch all invitations and filter client-side to avoid compound index
    const invitationsSnapshot = await db.collection(INVITATIONS_COLLECTION).get();
    
    let pendingInvitations: SubAdminInvitation[] = invitationsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
      }))
      .filter(inv => inv.status === 'pending') as SubAdminInvitation[];

    // Sort by createdAt descending (client-side)
    pendingInvitations.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    res.json({
      success: true,
      data: {
        subAdmins,
        pendingInvitations,
      },
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team data',
    });
  }
});

// POST /api/team/invite - Invite a new sub-admin (Core Admin Only)
router.post('/invite', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const validation = inviteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const { email, pagePermissions } = validation.data;
    const inviteeEmail = email.toLowerCase();
    const coreAdminEmail = (process.env.ADMIN_EMAIL || 'mjabdullah33@gmail.com').toLowerCase();

    if (inviteeEmail === coreAdminEmail) {
      res.status(400).json({
        success: false,
        error: 'Cannot invite the core admin email',
      });
      return;
    }

    const existingSubAdmin = await db.collection(SUB_ADMINS_COLLECTION)
      .where('email', '==', inviteeEmail)
      .limit(1)
      .get();

    if (!existingSubAdmin.empty) {
      res.status(400).json({
        success: false,
        error: 'This email is already a sub-admin',
      });
      return;
    }

    const existingInvitation = await db.collection(INVITATIONS_COLLECTION)
      .where('email', '==', inviteeEmail)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingInvitation.empty) {
      res.status(400).json({
        success: false,
        error: 'An invitation is already pending for this email',
      });
      return;
    }

    const token = generateInviteToken();
    const expiresAt = getExpirationDate(7);
    
    const invitation: Omit<SubAdminInvitation, 'id'> = {
      email: inviteeEmail,
      invitedBy: req.user!.uid,
      invitedByEmail: req.user!.email,
      status: 'pending',
      token,
      expiresAt,
      createdAt: new Date(),
      pagePermissions: pagePermissions || DEFAULT_VIEW_PERMISSIONS,
    };

    const docRef = await db.collection(INVITATIONS_COLLECTION).add(invitation);

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...invitation,
        inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tree/admin/accept-invite?token=${token}`,
      },
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invitation',
    });
  }
});

// GET /api/team/invite/verify/:token - Verify invitation token (Public - for accept flow)
router.get('/invite/verify/:token', async (req, res: Response) => {
  try {
    const { token } = req.params;

    const invitationSnapshot = await db.collection(INVITATIONS_COLLECTION)
      .where('token', '==', token)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (invitationSnapshot.empty) {
      res.status(404).json({
        success: false,
        error: 'Invalid or expired invitation',
      });
      return;
    }

    const invitationDoc = invitationSnapshot.docs[0];
    const invitation = invitationDoc.data();

    if (new Date() > invitation.expiresAt.toDate()) {
      await invitationDoc.ref.update({ status: 'expired' });
      res.status(400).json({
        success: false,
        error: 'This invitation has expired',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        email: invitation.email,
        invitedByEmail: invitation.invitedByEmail,
        expiresAt: invitation.expiresAt.toDate(),
        pagePermissions: invitation.pagePermissions,
      },
    });
  } catch (error) {
    console.error('Error verifying invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify invitation',
    });
  }
});

// POST /api/team/invite/accept/:token - Accept invitation (Authenticated - no admin check)
router.post('/invite/accept/:token', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.params;

    const invitationSnapshot = await db.collection(INVITATIONS_COLLECTION)
      .where('token', '==', token)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (invitationSnapshot.empty) {
      res.status(404).json({
        success: false,
        error: 'Invalid or expired invitation',
      });
      return;
    }

    const invitationDoc = invitationSnapshot.docs[0];
    const invitation = invitationDoc.data();

    if (new Date() > invitation.expiresAt.toDate()) {
      await invitationDoc.ref.update({ status: 'expired' });
      res.status(400).json({
        success: false,
        error: 'This invitation has expired',
      });
      return;
    }

    const userEmail = req.user!.email.toLowerCase();
    if (userEmail !== invitation.email.toLowerCase()) {
      res.status(403).json({
        success: false,
        error: 'This invitation was sent to a different email address',
      });
      return;
    }

    const userRecord = await auth.getUser(req.user!.uid);

    const subAdmin: Omit<SubAdmin, 'id'> = {
      uid: req.user!.uid,
      email: userEmail,
      name: userRecord.displayName || null,
      photoUrl: userRecord.photoURL || null,
      invitedBy: invitation.invitedBy,
      invitedByEmail: invitation.invitedByEmail,
      isActive: true,
      pagePermissions: invitation.pagePermissions,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    const subAdminRef = await db.collection(SUB_ADMINS_COLLECTION).add(subAdmin);

    await invitationDoc.ref.update({
      status: 'accepted',
      acceptedAt: new Date(),
    });

    res.json({
      success: true,
      data: {
        id: subAdminRef.id,
        ...subAdmin,
      },
      message: 'Invitation accepted successfully. You now have access to the admin panel.',
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept invitation',
    });
  }
});

// DELETE /api/team/invite/:id - Cancel/revoke invitation (Core Admin Only)
router.delete('/invite/:id', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const { id } = req.params;

    const invitationRef = db.collection(INVITATIONS_COLLECTION).doc(id);
    const invitationDoc = await invitationRef.get();

    if (!invitationDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Invitation not found',
      });
      return;
    }

    await invitationRef.delete();

    res.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel invitation',
    });
  }
});

// PUT /api/team/:id/permissions - Update sub-admin permissions (Core Admin Only)
router.put('/:id/permissions', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updatePermissionsSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const subAdminRef = db.collection(SUB_ADMINS_COLLECTION).doc(id);
    const subAdminDoc = await subAdminRef.get();

    if (!subAdminDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Sub-admin not found',
      });
      return;
    }

    await subAdminRef.update({
      pagePermissions: validation.data.pagePermissions,
    });

    res.json({
      success: true,
      message: 'Permissions updated successfully',
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update permissions',
    });
  }
});

// PUT /api/team/:id/disable - Disable sub-admin (Core Admin Only)
router.put('/:id/disable', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const { id } = req.params;
    const validation = disableSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const subAdminRef = db.collection(SUB_ADMINS_COLLECTION).doc(id);
    const subAdminDoc = await subAdminRef.get();

    if (!subAdminDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Sub-admin not found',
      });
      return;
    }

    await subAdminRef.update({
      isActive: false,
      disabledAt: new Date(),
      disabledReason: validation.data.reason || null,
    });

    res.json({
      success: true,
      message: 'Sub-admin disabled successfully',
    });
  } catch (error) {
    console.error('Error disabling sub-admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable sub-admin',
    });
  }
});

// PUT /api/team/:id/enable - Re-enable sub-admin (Core Admin Only)
router.put('/:id/enable', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const { id } = req.params;

    const subAdminRef = db.collection(SUB_ADMINS_COLLECTION).doc(id);
    const subAdminDoc = await subAdminRef.get();

    if (!subAdminDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Sub-admin not found',
      });
      return;
    }

    await subAdminRef.update({
      isActive: true,
      disabledAt: null,
      disabledReason: null,
    });

    res.json({
      success: true,
      message: 'Sub-admin enabled successfully',
    });
  } catch (error) {
    console.error('Error enabling sub-admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable sub-admin',
    });
  }
});

// DELETE /api/team/:id - Delete sub-admin (Core Admin Only)
router.delete('/:id', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const { id } = req.params;

    const subAdminRef = db.collection(SUB_ADMINS_COLLECTION).doc(id);
    const subAdminDoc = await subAdminRef.get();

    if (!subAdminDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Sub-admin not found',
      });
      return;
    }

    await subAdminRef.delete();

    res.json({
      success: true,
      message: 'Sub-admin deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting sub-admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sub-admin',
    });
  }
});

// GET /api/team/my-permissions - Get current user's permissions (Authenticated)
router.get('/my-permissions', authenticateWithPermissions, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    if (req.isCoreAdmin) {
      const allPermissions: Permission[] = ['VIEW', 'CREATE', 'UPDATE', 'DELETE'];
      const adminPages: AdminPage[] = ['dashboard', 'profile', 'about', 'skills', 'projects', 'education', 'experience', 'faqs', 'messages'];
      
      res.json({
        success: true,
        data: {
          isCoreAdmin: true,
          isSubAdmin: false,
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

    if (req.isSubAdmin && req.subAdmin) {
      res.json({
        success: true,
        data: {
          isCoreAdmin: false,
          isSubAdmin: true,
          subAdminId: req.subAdmin.id,
          name: req.subAdmin.name,
          email: req.subAdmin.email,
          pagePermissions: req.subAdmin.pagePermissions,
          canAccessTeamManagement: false,
          canAccessRequests: false,
        },
      });
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Access denied',
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions',
    });
  }
});

export default router;
