import { Router, Response } from 'express';
import multer from 'multer';
import { db } from '../config/firebase';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { authenticateWithPermissions, requirePermission } from '../middleware/permissions';
import { AuthenticatedRequestWithPermissions } from '../types';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and images are allowed.'));
    }
  },
});

// GET /api/files/cv - Get CV download URL (public)
router.get('/cv', async (req, res: Response) => {
  try {
    const profileDoc = await db.collection('profile').doc('main').get();
    
    if (!profileDoc.exists) {
      res.status(404).json({
        success: false,
        error: 'Profile not found',
      });
      return;
    }

    const profile = profileDoc.data();
    
    if (!profile?.cvUrl) {
      res.status(404).json({
        success: false,
        error: 'CV not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        url: profile.cvUrl,
        fileName: profile.cvFileName || 'CV.pdf',
      },
    });
  } catch (error) {
    console.error('Error fetching CV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CV',
    });
  }
});

// POST /api/files/cv - Upload new CV (requires UPDATE permission on profile)
router.post('/cv', authenticateWithPermissions, requirePermission('profile', 'UPDATE'), upload.single('cv'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    if (req.file.mimetype !== 'application/pdf') {
      res.status(400).json({
        success: false,
        error: 'CV must be a PDF file',
      });
      return;
    }

    // Check if sub-admin needs approval
    if (req.isSubAdmin) {
      // Upload to Cloudinary pending folder (will be moved/used after approval)
      const result = await uploadToCloudinary(req.file.buffer, 'cv-pending', 'raw');

      // Create a pending request for CV upload
      const pendingRequest = {
        action: 'UPDATE',
        resourceType: 'cvUpload',
        resourceName: req.file.originalname,
        page: 'profile',
        data: {
          cvUrl: result.url,
          cvPublicId: result.publicId,
          cvFileName: req.file.originalname,
        },
        requestedBy: req.subAdmin?.email || req.user?.email,
        requestedByName: req.subAdmin?.name || 'Sub Admin',
        status: 'pending',
        createdAt: new Date(),
      };

      await db.collection('pendingRequests').add(pendingRequest);

      res.json({
        success: true,
        data: { 
          cvUrl: result.url,
          requiresApproval: true,
        },
        message: 'CV upload request submitted for approval',
      });
      return;
    }

    // Core admin - upload directly
    const result = await uploadToCloudinary(req.file.buffer, 'cv', 'raw');

    // Delete old CV if exists
    const profileDoc = await db.collection('profile').doc('main').get();
    if (profileDoc.exists) {
      const oldPublicId = profileDoc.data()?.cvPublicId;
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId, 'raw');
      }
    }

    // Update profile with new CV URL
    await db.collection('profile').doc('main').set({
      cvUrl: result.url,
      cvPublicId: result.publicId,
      cvFileName: req.file.originalname,
      updatedAt: new Date(),
    }, { merge: true });
    
    res.json({
      success: true,
      data: { cvUrl: result.url },
      message: 'CV uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading CV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload CV',
    });
  }
});

// POST /api/files/avatar - Upload avatar (requires UPDATE permission on profile)
// This is kept for backward compatibility - uploads to general avatarUrl
router.post('/avatar', authenticateWithPermissions, requirePermission('profile', 'UPDATE'), upload.single('avatar'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedImageTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        error: 'Avatar must be an image file (JPEG, PNG, GIF, or WebP)',
      });
      return;
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'avatars', 'image');

    // Delete old avatar if exists
    const profileDoc = await db.collection('profile').doc('main').get();
    if (profileDoc.exists) {
      const oldPublicId = profileDoc.data()?.avatarPublicId;
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId, 'image');
      }
    }

    // Update profile with new avatar URL
    await db.collection('profile').doc('main').set({
      avatarUrl: result.url,
      avatarPublicId: result.publicId,
      updatedAt: new Date(),
    }, { merge: true });
    
    res.json({
      success: true,
      data: { avatarUrl: result.url },
      message: 'Avatar uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload avatar',
    });
  }
});

// POST /api/files/home-avatar - Upload home page avatar (requires UPDATE permission on profile)
router.post('/home-avatar', authenticateWithPermissions, requirePermission('profile', 'UPDATE'), upload.single('avatar'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedImageTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        error: 'Avatar must be an image file (JPEG, PNG, GIF, or WebP)',
      });
      return;
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'avatars/home', 'image');

    // Delete old home avatar if exists
    const profileDoc = await db.collection('profile').doc('main').get();
    if (profileDoc.exists) {
      const oldPublicId = profileDoc.data()?.homeAvatarPublicId;
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId, 'image');
      }
    }

    // Update profile with new home avatar URL
    await db.collection('profile').doc('main').set({
      homeAvatarUrl: result.url,
      homeAvatarPublicId: result.publicId,
      updatedAt: new Date(),
    }, { merge: true });
    
    res.json({
      success: true,
      data: { homeAvatarUrl: result.url },
      message: 'Home avatar uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading home avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload home avatar',
    });
  }
});

// POST /api/files/about-avatar - Upload about page avatar (requires UPDATE permission on profile)
router.post('/about-avatar', authenticateWithPermissions, requirePermission('profile', 'UPDATE'), upload.single('avatar'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedImageTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        error: 'Avatar must be an image file (JPEG, PNG, GIF, or WebP)',
      });
      return;
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'avatars/about', 'image');

    // Delete old about avatar if exists
    const profileDoc = await db.collection('profile').doc('main').get();
    if (profileDoc.exists) {
      const oldPublicId = profileDoc.data()?.aboutAvatarPublicId;
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId, 'image');
      }
    }

    // Update profile with new about avatar URL
    await db.collection('profile').doc('main').set({
      aboutAvatarUrl: result.url,
      aboutAvatarPublicId: result.publicId,
      updatedAt: new Date(),
    }, { merge: true });
    
    res.json({
      success: true,
      data: { aboutAvatarUrl: result.url },
      message: 'About avatar uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading about avatar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload about avatar',
    });
  }
});

// POST /api/files/project-image - Upload project image (requires CREATE or UPDATE permission on projects)
router.post('/project-image', authenticateWithPermissions, requirePermission('projects', 'UPDATE'), upload.single('image'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
      return;
    }

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedImageTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        error: 'Project image must be an image file (JPEG, PNG, GIF, or WebP)',
      });
      return;
    }

    // Generate a hash of the file to check for duplicates
    const crypto = require('crypto');
    const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');

    // Check if we already have this image cached in Firebase
    const cachedImageDoc = await db.collection('imageCache').doc(fileHash).get();
    if (cachedImageDoc.exists) {
      const cachedData = cachedImageDoc.data();
      // Return cached URL instead of uploading again
      res.json({
        success: true,
        data: { 
          imageUrl: cachedData?.url,
          imagePublicId: cachedData?.publicId,
          cached: true,
        },
        message: 'Image retrieved from cache',
      });
      return;
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, 'projects', 'image');
    
    // Cache the image reference in Firebase
    await db.collection('imageCache').doc(fileHash).set({
      url: result.url,
      publicId: result.publicId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      createdAt: new Date(),
    });
    
    res.json({
      success: true,
      data: { 
        imageUrl: result.url,
        imagePublicId: result.publicId,
        cached: false,
      },
      message: 'Project image uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading project image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload project image',
    });
  }
});

// DELETE /api/files/image - Delete an image (requires DELETE permission on projects)
router.delete('/image', authenticateWithPermissions, requirePermission('projects', 'DELETE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const { publicId, resourceType = 'image' } = req.body;
    
    if (!publicId) {
      res.status(400).json({
        success: false,
        error: 'Public ID is required',
      });
      return;
    }

    await deleteFromCloudinary(publicId, resourceType as 'image' | 'raw');
    
    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
    });
  }
});

export default router;
