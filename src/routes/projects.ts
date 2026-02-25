import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

const router = Router();

const githubRepoSchema = z.object({
  label: z.string().min(1).max(50),
  url: z.string().url(),
});

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  imageUrl: z.string().url().optional().or(z.literal('')),
  technologies: z.array(z.string()),
  githubUrl: z.string().url().optional().or(z.literal('')),
  githubUrls: z.array(githubRepoSchema).optional(),
  liveUrl: z.string().url().optional().or(z.literal('')),
  featured: z.boolean(),
  order: z.number().int().min(0),
});

// GET /api/projects - Get all projects
router.get('/', async (req, res: Response) => {
  try {
    const snapshot = await db.collection('projects').orderBy('order').get();

    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', async (req, res: Response) => {
  try {
    const id = req.params.id as string;
    const doc = await db.collection('projects').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { id: doc.id, ...doc.data() },
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
});

// POST /api/projects - Create project
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = projectSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid project data',
        details: validation.error.errors,
      });
      return;
    }

    const projectData = {
      ...validation.data,
      createdAt: new Date(),
    };

    const docRef = await db.collection('projects').add(projectData);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...projectData },
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
    });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = projectSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid project data',
        details: validation.error.errors,
      });
      return;
    }

    const doc = await db.collection('projects').doc(id).get();
    
    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    await db.collection('projects').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Project updated successfully',
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const doc = await db.collection('projects').doc(id).get();
    
    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
      });
      return;
    }

    await db.collection('projects').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
});

// PUT /api/projects/reorder - Bulk reorder projects
router.put('/batch/reorder', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projects } = req.body;
    
    if (!projects || !Array.isArray(projects)) {
      res.status(400).json({
        success: false,
        error: 'Invalid projects data',
      });
      return;
    }
    
    const batch = db.batch();
    
    projects.forEach((item: { id: string; order: number }) => {
      const ref = db.collection('projects').doc(item.id);
      batch.update(ref, { order: item.order });
    });
    
    await batch.commit();
    
    res.json({
      success: true,
      message: 'Projects reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder projects',
    });
  }
});

// PATCH /api/projects/:id/featured - Toggle featured status
router.patch('/:id/featured', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { featured } = req.body;
    
    if (typeof featured !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Invalid featured value',
      });
      return;
    }

    await db.collection('projects').doc(id).update({ featured });
    
    res.json({
      success: true,
      message: `Project ${featured ? 'featured' : 'unfeatured'} successfully`,
    });
  } catch (error) {
    console.error('Error updating project featured status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project featured status',
    });
  }
});

export default router;
