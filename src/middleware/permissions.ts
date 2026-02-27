import { Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase';
import { 
  AuthenticatedRequestWithPermissions, 
  SubAdmin, 
  Permission, 
  AdminPage,
  PagePermission 
} from '../types';

const CORE_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mjabdullah33@gmail.com';
const SUB_ADMINS_COLLECTION = 'subAdmins';

export const authenticateWithPermissions = async (
  req: AuthenticatedRequestWithPermissions,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: No token provided',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const userEmail = decodedToken.email?.toLowerCase() || '';
    
    req.user = {
      uid: decodedToken.uid,
      email: userEmail,
    };

    const coreAdminEmail = CORE_ADMIN_EMAIL.toLowerCase();
    
    if (userEmail === coreAdminEmail) {
      req.isCoreAdmin = true;
      req.isSubAdmin = false;
      next();
      return;
    }

    // Query sub-admins - avoid compound query issues by fetching all and filtering client-side
    const subAdminSnapshot = await db.collection(SUB_ADMINS_COLLECTION)
      .where('email', '==', userEmail)
      .get();

    // Filter for active sub-admins on the client side
    const activeSubAdmin = subAdminSnapshot.docs.find(doc => {
      const data = doc.data();
      return data.isActive === true;
    });

    if (activeSubAdmin) {
      const subAdminData = activeSubAdmin.data();
      const subAdmin = { id: activeSubAdmin.id, ...subAdminData } as SubAdmin;
      
      // Debug: Log the raw data from Firestore
      console.log(`[Auth] Sub-admin found: ${userEmail}`);
      console.log(`[Auth] isActive: ${subAdminData.isActive}`);
      console.log(`[Auth] Raw pagePermissions from DB:`, JSON.stringify(subAdminData.pagePermissions));
      
      req.isCoreAdmin = false;
      req.isSubAdmin = true;
      req.subAdmin = subAdmin;
      req.permissions = subAdmin.pagePermissions || [];

      await activeSubAdmin.ref.update({ lastLoginAt: new Date() });
      
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Access denied. You are not authorized to access this admin panel.',
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid token',
    });
  }
};

export const requireCoreAdmin = (
  req: AuthenticatedRequestWithPermissions,
  res: Response,
  next: NextFunction
): void => {
  if (!req.isCoreAdmin) {
    res.status(403).json({
      success: false,
      error: 'Access denied. Only the core admin can perform this action.',
    });
    return;
  }
  next();
};

export const requirePermission = (page: AdminPage, permission: Permission) => {
  return (
    req: AuthenticatedRequestWithPermissions,
    res: Response,
    next: NextFunction
  ): void => {
    if (req.isCoreAdmin) {
      next();
      return;
    }

    if (!req.isSubAdmin || !req.permissions) {
      res.status(403).json({
        success: false,
        error: 'Access denied. No permissions found.',
      });
      return;
    }

    const pagePermission = req.permissions.find((p: PagePermission) => p.page === page);
    
    console.log(`[Permission Check] User: ${req.user?.email}, Page: ${page}, Required: ${permission}`);
    console.log(`[Permission Check] User's permissions for ${page}:`, pagePermission?.permissions || []);
    
    if (!pagePermission || !pagePermission.permissions.includes(permission)) {
      console.log(`[Permission DENIED] User ${req.user?.email} lacks ${permission} for ${page}`);
      if (permission === 'VIEW') {
        res.status(403).json({
          success: false,
          error: `Access denied. You do not have permission to view ${page}.`,
        });
      } else {
        res.status(403).json({
          success: false,
          error: `You don't have ${permission} permission for this page.`,
          data: { requiresApproval: true, page, permission },
        });
      }
      return;
    }
    
    // For sub-admins with UPDATE or DELETE permissions, require them to submit a request
    // Only VIEW and CREATE are allowed directly (CREATE adds new items, UPDATE/DELETE modify existing)
    if ((permission === 'UPDATE' || permission === 'DELETE') && req.isSubAdmin) {
      console.log(`[Permission REQUIRES APPROVAL] User ${req.user?.email} has ${permission} for ${page} but needs core admin approval`);
      res.status(403).json({
        success: false,
        error: `You have ${permission} permission, but changes require core admin approval. Please submit a request.`,
        data: { 
          requiresApproval: true, 
          page, 
          permission,
          hasPermission: true,
        },
      });
      return;
    }
    
    console.log(`[Permission GRANTED] User ${req.user?.email} has ${permission} for ${page}`);

    next();
  };
};

export const hasPermission = (
  permissions: PagePermission[] | undefined,
  page: AdminPage,
  permission: Permission
): boolean => {
  if (!permissions) return false;
  const pagePermission = permissions.find((p: PagePermission) => p.page === page);
  return pagePermission ? pagePermission.permissions.includes(permission) : false;
};

export const checkWritePermissionOrCreateRequest = (page: AdminPage, permission: Permission) => {
  return async (
    req: AuthenticatedRequestWithPermissions,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (req.isCoreAdmin) {
      next();
      return;
    }

    if (!req.isSubAdmin || !req.permissions || !req.subAdmin) {
      res.status(403).json({
        success: false,
        error: 'Access denied. No permissions found.',
      });
      return;
    }

    const pagePermission = req.permissions.find((p: PagePermission) => p.page === page);
    
    if (pagePermission && pagePermission.permissions.includes(permission)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: `You do not have ${permission} permission for ${page}. Please submit a request for approval.`,
      data: { 
        requiresApproval: true, 
        page, 
        permission,
        subAdminId: req.subAdmin.id,
      },
    });
  };
};
