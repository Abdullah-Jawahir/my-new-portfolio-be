import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticateWithPermissions, requireCoreAdmin } from '../middleware/permissions';
import { 
  AuthenticatedRequestWithPermissions, 
  PendingRequest,
  RequestAction,
  AdminPage,
  RequestStatus
} from '../types';
import { z } from 'zod';

const router = Router();

const PENDING_REQUESTS_COLLECTION = 'pendingRequests';

const createRequestSchema = z.object({
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  resourceType: z.string(),
  resourceId: z.string().optional(),
  resourceName: z.string().optional(),
  page: z.enum(['dashboard', 'profile', 'about', 'skills', 'projects', 'education', 'experience', 'faqs', 'messages']),
  data: z.record(z.unknown()),
  previousData: z.record(z.unknown()).optional(),
  reason: z.string().optional(),
});

const processRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().optional(),
});

// GET /api/requests - Get all pending requests (Core Admin Only)
router.get('/', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const statusFilter = req.query.status as RequestStatus | undefined;
    
    // Fetch all requests without compound query to avoid index requirements
    const requestsSnapshot = await db.collection(PENDING_REQUESTS_COLLECTION).get();
    
    let requests: PendingRequest[] = requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      processedAt: doc.data().processedAt?.toDate(),
    })) as PendingRequest[];

    // Sort by createdAt descending (client-side)
    requests.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Filter by status if provided (client-side)
    if (statusFilter) {
      requests = requests.filter(r => r.status === statusFilter);
    }

    const allRequests = requestsSnapshot.docs.map(doc => doc.data());
    const pendingCount = allRequests.filter(r => r.status === 'pending').length;
    const approvedCount = allRequests.filter(r => r.status === 'approved').length;
    const rejectedCount = allRequests.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      data: {
        requests,
        stats: {
          total: allRequests.length,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
    });
  }
});

// GET /api/requests/my-requests - Get current sub-admin's requests
router.get('/my-requests', authenticateWithPermissions, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    if (req.isCoreAdmin) {
      res.json({
        success: true,
        data: {
          requests: [],
          message: 'Core admin does not have pending requests',
        },
      });
      return;
    }

    if (!req.isSubAdmin || !req.subAdmin) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    const requestsSnapshot = await db.collection(PENDING_REQUESTS_COLLECTION)
      .where('subAdminId', '==', req.subAdmin.id)
      .orderBy('createdAt', 'desc')
      .get();

    const requests: PendingRequest[] = requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      processedAt: doc.data().processedAt?.toDate(),
    })) as PendingRequest[];

    res.json({
      success: true,
      data: { requests },
    });
  } catch (error) {
    console.error('Error fetching my requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
    });
  }
});

// POST /api/requests - Create a new request (Sub-Admin Only)
router.post('/', authenticateWithPermissions, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    if (req.isCoreAdmin) {
      res.status(400).json({
        success: false,
        error: 'Core admin does not need to create requests',
      });
      return;
    }

    if (!req.isSubAdmin || !req.subAdmin) {
      res.status(403).json({
        success: false,
        error: 'Only sub-admins can create requests',
      });
      return;
    }

    const validation = createRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const { action, resourceType, resourceId, resourceName, page, data, previousData, reason } = validation.data;

    // Check for existing similar pending request (simplified query to avoid index issues)
    const existingRequestsSnapshot = await db.collection(PENDING_REQUESTS_COLLECTION)
      .where('subAdminId', '==', req.subAdmin.id)
      .where('status', '==', 'pending')
      .get();

    const duplicateRequest = existingRequestsSnapshot.docs.find(doc => {
      const data = doc.data();
      return data.action === action && 
             data.resourceType === resourceType && 
             data.page === page &&
             (!resourceId || data.resourceId === resourceId);
    });

    if (duplicateRequest) {
      res.status(400).json({
        success: false,
        error: 'A similar request is already pending',
      });
      return;
    }

    // Build the request object, filtering out undefined values
    const pendingRequest: Record<string, unknown> = {
      subAdminId: req.subAdmin.id,
      subAdminEmail: req.subAdmin.email,
      subAdminName: req.subAdmin.name,
      action: action as RequestAction,
      resourceType,
      page: page as AdminPage,
      data,
      status: 'pending',
      createdAt: new Date(),
    };

    // Only add optional fields if they have values
    if (resourceId) pendingRequest.resourceId = resourceId;
    if (resourceName) pendingRequest.resourceName = resourceName;
    if (previousData) pendingRequest.previousData = previousData;
    if (reason) pendingRequest.reason = reason;

    const docRef = await db.collection(PENDING_REQUESTS_COLLECTION).add(pendingRequest);

    res.status(201).json({
      success: true,
      data: {
        id: docRef.id,
        ...pendingRequest,
      },
      message: 'Request submitted successfully. Waiting for core admin approval.',
    });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create request',
    });
  }
});

// PUT /api/requests/:id/process - Approve or reject a request (Core Admin Only)
router.put('/:id/process', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = processRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
      return;
    }

    const { status, rejectionReason } = validation.data;

    const requestRef = db.collection(PENDING_REQUESTS_COLLECTION).doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }

    const requestData = requestDoc.data() as PendingRequest;

    if (requestData.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: 'This request has already been processed',
      });
      return;
    }

    const updateData: Partial<PendingRequest> = {
      status: status as RequestStatus,
      processedAt: new Date(),
      processedBy: req.user!.uid,
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await requestRef.update(updateData);

    let actionResult = null;
    if (status === 'approved') {
      actionResult = await executeApprovedRequest(requestData);
    }

    res.json({
      success: true,
      data: {
        status,
        actionResult,
      },
      message: status === 'approved' 
        ? 'Request approved and executed successfully' 
        : 'Request rejected',
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
    });
  }
});

// DELETE /api/requests/:id - Delete a request (Core Admin or request owner)
router.delete('/:id', authenticateWithPermissions, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;

    const requestRef = db.collection(PENDING_REQUESTS_COLLECTION).doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
      });
      return;
    }

    const requestData = requestDoc.data() as PendingRequest;

    if (!req.isCoreAdmin) {
      if (!req.isSubAdmin || !req.subAdmin || req.subAdmin.id !== requestData.subAdminId) {
        res.status(403).json({
          success: false,
          error: 'You can only delete your own requests',
        });
        return;
      }

      if (requestData.status !== 'pending') {
        res.status(400).json({
          success: false,
          error: 'Cannot delete processed requests',
        });
        return;
      }
    }

    await requestRef.delete();

    res.json({
      success: true,
      message: 'Request deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete request',
    });
  }
});

// GET /api/requests/stats - Get request statistics (Core Admin Only)
router.get('/stats', authenticateWithPermissions, requireCoreAdmin, async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const requestsSnapshot = await db.collection(PENDING_REQUESTS_COLLECTION).get();
    
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    const byPage: Record<string, number> = {};
    const byAction: Record<string, number> = {};

    requestsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      if (data.status === 'pending') pending++;
      else if (data.status === 'approved') approved++;
      else if (data.status === 'rejected') rejected++;

      byPage[data.page] = (byPage[data.page] || 0) + 1;
      byAction[data.action] = (byAction[data.action] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total: requestsSnapshot.size,
        pending,
        approved,
        rejected,
        byPage,
        byAction,
      },
    });
  } catch (error) {
    console.error('Error fetching request stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request statistics',
    });
  }
});

async function executeApprovedRequest(request: PendingRequest): Promise<{ success: boolean; message: string }> {
  try {
    // Special handling for aboutProfile - updates profile document with specific fields
    if (request.resourceType === 'aboutProfile') {
      if (request.action === 'UPDATE') {
        await db.collection('profile').doc('main').set({
          ...request.data,
          updatedAt: new Date(),
        }, { merge: true });
        return { success: true, message: 'Updated about profile content' };
      }
      return { success: false, message: 'Invalid action for aboutProfile' };
    }

    // Special handling for CV upload approval
    if (request.resourceType === 'cvUpload') {
      if (request.action === 'UPDATE') {
        const { deleteFromCloudinary } = await import('../config/cloudinary');
        
        // Delete old CV if exists
        const profileDoc = await db.collection('profile').doc('main').get();
        if (profileDoc.exists) {
          const oldPublicId = profileDoc.data()?.cvPublicId;
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId, 'raw');
          }
        }

        // Update profile with the pending CV URL (it's already uploaded to Cloudinary)
        await db.collection('profile').doc('main').set({
          cvUrl: request.data.cvUrl,
          cvPublicId: request.data.cvPublicId,
          cvFileName: request.data.cvFileName,
          updatedAt: new Date(),
        }, { merge: true });
        
        return { success: true, message: 'CV upload approved and applied' };
      }
      return { success: false, message: 'Invalid action for cvUpload' };
    }

    // Special handling for home avatar upload approval
    if (request.resourceType === 'homeAvatarUpload') {
      if (request.action === 'UPDATE') {
        const { deleteFromCloudinary } = await import('../config/cloudinary');
        
        // Delete old home avatar if exists
        const profileDoc = await db.collection('profile').doc('main').get();
        if (profileDoc.exists) {
          const oldPublicId = profileDoc.data()?.homeAvatarPublicId;
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId, 'image');
          }
        }

        // Update profile with the pending home avatar URL (it's already uploaded to Cloudinary)
        await db.collection('profile').doc('main').set({
          homeAvatarUrl: request.data.homeAvatarUrl,
          homeAvatarPublicId: request.data.homeAvatarPublicId,
          updatedAt: new Date(),
        }, { merge: true });
        
        return { success: true, message: 'Home avatar upload approved and applied' };
      }
      return { success: false, message: 'Invalid action for homeAvatarUpload' };
    }

    // Special handling for about avatar upload approval
    if (request.resourceType === 'aboutAvatarUpload') {
      if (request.action === 'UPDATE') {
        const { deleteFromCloudinary } = await import('../config/cloudinary');
        
        // Delete old about avatar if exists
        const profileDoc = await db.collection('profile').doc('main').get();
        if (profileDoc.exists) {
          const oldPublicId = profileDoc.data()?.aboutAvatarPublicId;
          if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId, 'image');
          }
        }

        // Update profile with the pending about avatar URL (it's already uploaded to Cloudinary)
        await db.collection('profile').doc('main').set({
          aboutAvatarUrl: request.data.aboutAvatarUrl,
          aboutAvatarPublicId: request.data.aboutAvatarPublicId,
          updatedAt: new Date(),
        }, { merge: true });
        
        return { success: true, message: 'About avatar upload approved and applied' };
      }
      return { success: false, message: 'Invalid action for aboutAvatarUpload' };
    }

    // Special handling for home avatar crop settings update approval
    if (request.resourceType === 'homeAvatarCropUpdate') {
      if (request.action === 'UPDATE') {
        await db.collection('profile').doc('main').set({
          homeAvatarCrop: request.data.homeAvatarCrop,
          updatedAt: new Date(),
        }, { merge: true });
        
        return { success: true, message: 'Home avatar crop settings approved and applied' };
      }
      return { success: false, message: 'Invalid action for homeAvatarCropUpdate' };
    }

    // Special handling for about avatar crop settings update approval
    if (request.resourceType === 'aboutAvatarCropUpdate') {
      if (request.action === 'UPDATE') {
        await db.collection('profile').doc('main').set({
          aboutAvatarCrop: request.data.aboutAvatarCrop,
          updatedAt: new Date(),
        }, { merge: true });
        
        return { success: true, message: 'About avatar crop settings approved and applied' };
      }
      return { success: false, message: 'Invalid action for aboutAvatarCropUpdate' };
    }

    // Special handling for reorder operations
    if (request.resourceType === 'reorder') {
      const reorderData = request.data as { collection: string; items: Array<{ id: string; order: number; featured?: boolean }> };
      const batch = db.batch();
      
      for (const item of reorderData.items) {
        const docRef = db.collection(reorderData.collection).doc(item.id);
        const updateData: Record<string, unknown> = { order: item.order, updatedAt: new Date() };
        if (item.featured !== undefined) {
          updateData.featured = item.featured;
        }
        batch.update(docRef, updateData);
      }
      
      await batch.commit();
      return { success: true, message: `Reordered ${reorderData.items.length} items in ${reorderData.collection}` };
    }

    const collectionMap: Record<string, string> = {
      profile: 'profile',
      stat: 'stats',
      contactInfo: 'contactInfo',
      socialLink: 'socialLinks',
      skillCategory: 'skillCategories',
      additionalSkill: 'additionalSkills',
      toolTechnology: 'toolsTechnologies',
      project: 'projects',
      education: 'education',
      workExperience: 'workExperience',
      certification: 'certifications',
      coreValue: 'coreValues',
      interest: 'interests',
      learningGoal: 'learningGoals',
      funFact: 'funFacts',
      faq: 'faqs',
      message: 'messages',
    };

    const collection = collectionMap[request.resourceType];
    if (!collection) {
      return { success: false, message: `Unknown resource type: ${request.resourceType}` };
    }

    switch (request.action) {
      case 'CREATE': {
        const docRef = await db.collection(collection).add({
          ...request.data,
          createdAt: new Date(),
        });
        return { success: true, message: `Created ${request.resourceType} with ID: ${docRef.id}` };
      }
      case 'UPDATE': {
        if (!request.resourceId) {
          return { success: false, message: 'Resource ID required for update' };
        }
        await db.collection(collection).doc(request.resourceId).update({
          ...request.data,
          updatedAt: new Date(),
        });
        return { success: true, message: `Updated ${request.resourceType}: ${request.resourceId}` };
      }
      case 'DELETE': {
        // Handle bulk delete for messages
        if (request.resourceType === 'message' && request.data?.ids && Array.isArray(request.data.ids)) {
          const batch = db.batch();
          for (const id of request.data.ids as string[]) {
            batch.delete(db.collection(collection).doc(id));
          }
          await batch.commit();
          return { success: true, message: `Deleted ${(request.data.ids as string[]).length} messages` };
        }
        
        if (!request.resourceId) {
          return { success: false, message: 'Resource ID required for delete' };
        }
        await db.collection(collection).doc(request.resourceId).delete();
        return { success: true, message: `Deleted ${request.resourceType}: ${request.resourceId}` };
      }
      default:
        return { success: false, message: 'Unknown action' };
    }
  } catch (error) {
    console.error('Error executing approved request:', error);
    return { success: false, message: 'Failed to execute request' };
  }
}

export default router;
