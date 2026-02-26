import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

const router = Router();

const skillItemSchema = z.object({
  name: z.string().min(1).max(50),
  level: z.number().int().min(0).max(100),
  icon: z.string(),
  color: z.string(),
  order: z.number().int().min(0),
});

const skillCategorySchema = z.object({
  category: z.enum(['frontend', 'backend', 'database', 'devops', 'mobile', 'ai_ml', 'security', 'tools']),
  title: z.string().min(1).max(100),
  icon: z.string(),
  description: z.string().max(500),
  order: z.number().int().min(0),
  skills: z.array(skillItemSchema),
  featured: z.boolean().optional().default(true),
});

const additionalSkillSchema = z.object({
  name: z.string().min(1).max(50),
  order: z.number().int().min(0),
});

const toolTechSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  order: z.number().int().min(0),
});

// GET /api/skills - Get all skills
router.get('/', async (req, res: Response) => {
  try {
    const [categoriesSnapshot, additionalSnapshot, toolsSnapshot] = await Promise.all([
      db.collection('skillCategories').orderBy('order').get(),
      db.collection('additionalSkills').orderBy('order').get(),
      db.collection('toolsTechnologies').orderBy('order').get(),
    ]);

    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    const additionalSkills = additionalSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    const toolsTechnologies = toolsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: {
        categories,
        additionalSkills,
        toolsTechnologies,
      },
    });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills',
    });
  }
});

// POST /api/skills/categories - Create skill category
router.post('/categories', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = skillCategorySchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid skill category data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('skillCategories').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Skill category created successfully',
    });
  } catch (error) {
    console.error('Error creating skill category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create skill category',
    });
  }
});

// PUT /api/skills/categories/:id - Update skill category
router.put('/categories/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = skillCategorySchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid skill category data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('skillCategories').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Skill category updated successfully',
    });
  } catch (error) {
    console.error('Error updating skill category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update skill category',
    });
  }
});

// DELETE /api/skills/categories/:id - Delete skill category
router.delete('/categories/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('skillCategories').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Skill category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting skill category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete skill category',
    });
  }
});

// Additional Skills CRUD
router.post('/additional', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = additionalSkillSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid additional skill data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('additionalSkills').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Additional skill created successfully',
    });
  } catch (error) {
    console.error('Error creating additional skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create additional skill',
    });
  }
});

router.put('/additional/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = additionalSkillSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid additional skill data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('additionalSkills').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Additional skill updated successfully',
    });
  } catch (error) {
    console.error('Error updating additional skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update additional skill',
    });
  }
});

router.delete('/additional/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('additionalSkills').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Additional skill deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting additional skill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete additional skill',
    });
  }
});

// Tools & Technologies CRUD
router.post('/tools', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = toolTechSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid tool/technology data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('toolsTechnologies').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Tool/Technology created successfully',
    });
  } catch (error) {
    console.error('Error creating tool/technology:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tool/technology',
    });
  }
});

router.put('/tools/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = toolTechSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid tool/technology data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('toolsTechnologies').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Tool/Technology updated successfully',
    });
  } catch (error) {
    console.error('Error updating tool/technology:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tool/technology',
    });
  }
});

router.delete('/tools/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('toolsTechnologies').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Tool/Technology deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tool/technology:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tool/technology',
    });
  }
});

// Bulk update for reordering
router.put('/reorder', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { categories, additionalSkills } = req.body;
    
    const batch = db.batch();
    
    if (categories && Array.isArray(categories)) {
      categories.forEach((item: { id: string; order: number; featured?: boolean }) => {
        const ref = db.collection('skillCategories').doc(item.id);
        const updateData: Record<string, unknown> = { order: item.order };
        if (typeof item.featured === 'boolean') {
          updateData.featured = item.featured;
        }
        batch.update(ref, updateData);
      });
    }
    
    if (additionalSkills && Array.isArray(additionalSkills)) {
      additionalSkills.forEach((item: { id: string; order: number }) => {
        const ref = db.collection('additionalSkills').doc(item.id);
        batch.update(ref, { order: item.order });
      });
    }
    
    await batch.commit();
    
    res.json({
      success: true,
      message: 'Skills reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering skills:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder skills',
    });
  }
});

export default router;
