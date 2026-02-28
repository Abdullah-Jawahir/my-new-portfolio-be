import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticateWithPermissions, requirePermission } from '../middleware/permissions';
import { AuthenticatedRequestWithPermissions } from '../types';
import { z } from 'zod';

const router = Router();

const profileSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  greeting: z.string().max(200),
  description: z.string().max(2000),
  tagline: z.string().max(200).optional(),
  extendedBio: z.string().max(5000).optional(),
  personalQuote: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  yearsExperience: z.string().max(50).optional(),
  avatarUrl: z.string().url().optional(),
  cvUrl: z.string().url().optional(),
});

const statSchema = z.object({
  icon: z.string().optional().default(''),
  number: z.string(),
  label: z.string(),
  description: z.string().optional().default(''),
  order: z.number().int().min(0),
  featured: z.boolean().optional().default(true),
  isDynamic: z.boolean().optional().default(false),
  dynamicSource: z.string().optional(),
});

const contactInfoSchema = z.object({
  type: z.enum(['email', 'phone', 'location']),
  value: z.string(),
  href: z.string(),
  icon: z.string(),
});

const socialLinkSchema = z.object({
  platform: z.string(),
  url: z.string().url(),
  icon: z.string(),
  order: z.number().int().min(0),
});

// Helper function to calculate dynamic stat values
async function getDynamicStatValue(source: string): Promise<number> {
  try {
    switch (source) {
      case 'projects': {
        const projectsSnapshot = await db.collection('projects').get();
        return projectsSnapshot.size;
      }
      case 'certifications': {
        const certsSnapshot = await db.collection('certifications').get();
        return certsSnapshot.size;
      }
      case 'technologies': {
        const toolsSnapshot = await db.collection('toolsTechnologies').get();
        return toolsSnapshot.size;
      }
      case 'skills': {
        const categoriesSnapshot = await db.collection('skillCategories').get();
        let totalSkills = 0;
        categoriesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.skills && Array.isArray(data.skills)) {
            totalSkills += data.skills.length;
          }
        });
        return totalSkills;
      }
      case 'experience': {
        const workSnapshot = await db.collection('workExperience').get();
        return workSnapshot.size;
      }
      case 'yearsExperience': {
        const profileDoc = await db.collection('profile').doc('main').get();
        if (profileDoc.exists) {
          const data = profileDoc.data();
          const years = data?.yearsExperience;
          if (years) {
            const numericValue = parseInt(String(years).replace(/\D/g, ''), 10);
            return isNaN(numericValue) ? 0 : numericValue;
          }
        }
        return 0;
      }
      default:
        return 0;
    }
  } catch (error) {
    console.error(`Error fetching dynamic stat for ${source}:`, error);
    return 0;
  }
}

// GET /api/profile - Get profile data
router.get('/', async (req, res: Response) => {
  try {
    const profileDoc = await db.collection('profile').doc('main').get();
    const statsSnapshot = await db.collection('stats').orderBy('order').get();
    const contactInfoSnapshot = await db.collection('contactInfo').get();
    const socialLinksSnapshot = await db.collection('socialLinks').orderBy('order').get();

    const profile = profileDoc.exists ? { id: profileDoc.id, ...profileDoc.data() } : null;
    const contactInfo = contactInfoSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const socialLinks = socialLinksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Process stats and calculate dynamic values
    const statsPromises = statsSnapshot.docs.map(async doc => {
      const statData = { id: doc.id, ...doc.data() } as Record<string, unknown>;
      
      // If stat is dynamic, calculate the value from the source
      if (statData.isDynamic && statData.dynamicSource) {
        const dynamicValue = await getDynamicStatValue(statData.dynamicSource as string);
        // Keep original number as base, but use dynamic value
        statData.number = String(dynamicValue);
      }
      
      // Auto-add + suffix if not present and number is numeric
      const numStr = String(statData.number);
      if (!numStr.includes('+') && !numStr.includes('%') && /^\d+$/.test(numStr)) {
        statData.number = numStr + '+';
      }
      
      return statData;
    });

    const stats = await Promise.all(statsPromises);

    res.json({
      success: true,
      data: {
        profile,
        stats,
        contactInfo,
        socialLinks,
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile data',
    });
  }
});

// PUT /api/profile - Update profile (requires UPDATE permission)
router.put('/', authenticateWithPermissions, requirePermission('profile', 'UPDATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const validation = profileSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid profile data',
        details: validation.error.errors,
      });
      return;
    }

    const profileData = {
      ...validation.data,
      updatedAt: new Date(),
    };

    await db.collection('profile').doc('main').set(profileData, { merge: true });

    res.json({
      success: true,
      data: profileData,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
    });
  }
});

// Schema for about page profile fields only
const aboutProfileSchema = z.object({
  tagline: z.string().optional(),
  extendedBio: z.string().optional(),
  personalQuote: z.string().optional(),
  location: z.string().optional(),
  yearsExperience: z.string().optional(),
});

// PUT /api/profile/about - Update about-specific profile fields (requires UPDATE permission on 'about' page)
router.put('/about', authenticateWithPermissions, requirePermission('about', 'UPDATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const validation = aboutProfileSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid about profile data',
        details: validation.error.errors,
      });
      return;
    }

    const aboutData = {
      ...validation.data,
      updatedAt: new Date(),
    };

    await db.collection('profile').doc('main').set(aboutData, { merge: true });

    res.json({
      success: true,
      data: aboutData,
      message: 'About profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating about profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update about profile',
    });
  }
});

// Stats CRUD
router.post('/stats', authenticateWithPermissions, requirePermission('profile', 'CREATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const validation = statSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid stat data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('stats').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Stat created successfully',
    });
  } catch (error) {
    console.error('Error creating stat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stat',
    });
  }
});

router.put('/stats/:id', authenticateWithPermissions, requirePermission('profile', 'UPDATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = statSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid stat data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('stats').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Stat updated successfully',
    });
  } catch (error) {
    console.error('Error updating stat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stat',
    });
  }
});

router.delete('/stats/:id', authenticateWithPermissions, requirePermission('profile', 'DELETE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('stats').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Stat deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting stat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete stat',
    });
  }
});

// PUT /api/profile/stats/batch/reorder - Bulk reorder stats
router.put('/stats/batch/reorder', authenticateWithPermissions, requirePermission('profile', 'UPDATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      res.status(400).json({
        success: false,
        error: 'Items must be an array',
      });
      return;
    }

    const batch = db.batch();
    
    for (const item of items) {
      if (item.id && typeof item.order === 'number') {
        const docRef = db.collection('stats').doc(item.id);
        const updateData: Record<string, unknown> = { order: item.order };
        if (typeof item.featured === 'boolean') {
          updateData.featured = item.featured;
        }
        batch.update(docRef, updateData);
      }
    }

    await batch.commit();

    res.json({
      success: true,
      message: 'Stats reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder stats',
    });
  }
});

// Contact Info CRUD
router.post('/contact-info', authenticateWithPermissions, requirePermission('profile', 'CREATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const validation = contactInfoSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid contact info data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('contactInfo').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Contact info created successfully',
    });
  } catch (error) {
    console.error('Error creating contact info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contact info',
    });
  }
});

router.put('/contact-info/:id', authenticateWithPermissions, requirePermission('profile', 'UPDATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = contactInfoSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid contact info data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('contactInfo').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Contact info updated successfully',
    });
  } catch (error) {
    console.error('Error updating contact info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact info',
    });
  }
});

router.delete('/contact-info/:id', authenticateWithPermissions, requirePermission('profile', 'DELETE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('contactInfo').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Contact info deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contact info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact info',
    });
  }
});

// Social Links CRUD
router.post('/social-links', authenticateWithPermissions, requirePermission('profile', 'CREATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const validation = socialLinkSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid social link data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('socialLinks').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Social link created successfully',
    });
  } catch (error) {
    console.error('Error creating social link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create social link',
    });
  }
});

router.put('/social-links/:id', authenticateWithPermissions, requirePermission('profile', 'UPDATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = socialLinkSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid social link data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('socialLinks').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Social link updated successfully',
    });
  } catch (error) {
    console.error('Error updating social link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update social link',
    });
  }
});

router.delete('/social-links/:id', authenticateWithPermissions, requirePermission('profile', 'DELETE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('socialLinks').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Social link deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting social link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete social link',
    });
  }
});

export default router;
