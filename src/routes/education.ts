import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

const router = Router();

const educationSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200),
  period: z.string().max(50),
  description: z.string().max(1000),
  order: z.number().int().min(0),
});

// GET /api/education - Get all education entries
router.get('/', async (req, res: Response) => {
  try {
    const snapshot = await db.collection('education').orderBy('order').get();

    const education = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: education,
    });
  } catch (error) {
    console.error('Error fetching education:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch education data',
    });
  }
});

// GET /api/education/:id - Get single education entry
router.get('/:id', async (req, res: Response) => {
  try {
    const id = req.params.id as string;
    const doc = await db.collection('education').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Education entry not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { id: doc.id, ...doc.data() },
    });
  } catch (error) {
    console.error('Error fetching education entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch education entry',
    });
  }
});

// POST /api/education - Create education entry
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = educationSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid education data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('education').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Education entry created successfully',
    });
  } catch (error) {
    console.error('Error creating education entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create education entry',
    });
  }
});

// PUT /api/education/:id - Update education entry
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = educationSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid education data',
        details: validation.error.errors,
      });
      return;
    }

    const doc = await db.collection('education').doc(id).get();
    
    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Education entry not found',
      });
      return;
    }

    await db.collection('education').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Education entry updated successfully',
    });
  } catch (error) {
    console.error('Error updating education entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update education entry',
    });
  }
});

// DELETE /api/education/:id - Delete education entry
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const doc = await db.collection('education').doc(id).get();
    
    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Education entry not found',
      });
      return;
    }

    await db.collection('education').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Education entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting education entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete education entry',
    });
  }
});

// PUT /api/education/batch/reorder - Bulk reorder education
router.put('/batch/reorder', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { education } = req.body;
    
    if (!education || !Array.isArray(education)) {
      res.status(400).json({
        success: false,
        error: 'Invalid education data',
      });
      return;
    }
    
    const batch = db.batch();
    
    education.forEach((item: { id: string; order: number }) => {
      const ref = db.collection('education').doc(item.id);
      batch.update(ref, { order: item.order });
    });
    
    await batch.commit();
    
    res.json({
      success: true,
      message: 'Education entries reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering education:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder education entries',
    });
  }
});

export default router;
