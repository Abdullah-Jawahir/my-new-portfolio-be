import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticateWithPermissions, requirePermission } from '../middleware/permissions';
import { AuthenticatedRequestWithPermissions } from '../types';
import { z } from 'zod';

const router = Router();

const faqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(2000),
  category: z.string().max(50).optional(),
  order: z.number().int().min(0),
});

// GET /api/faqs - Get all FAQs
router.get('/', async (req, res: Response) => {
  try {
    const snapshot = await db.collection('faqs').orderBy('order').get();
    
    const faqs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({
      success: true,
      data: faqs,
    });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQs',
    });
  }
});

// POST /api/faqs - Create FAQ
router.post('/', authenticateWithPermissions, requirePermission('faqs', 'CREATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const validation = faqSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid FAQ data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('faqs').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'FAQ created successfully',
    });
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create FAQ',
    });
  }
});

// PUT /api/faqs/:id - Update FAQ
router.put('/:id', authenticateWithPermissions, requirePermission('faqs', 'UPDATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = faqSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid FAQ data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('faqs').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'FAQ updated successfully',
    });
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update FAQ',
    });
  }
});

// DELETE /api/faqs/:id - Delete FAQ
router.delete('/:id', authenticateWithPermissions, requirePermission('faqs', 'DELETE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('faqs').doc(id).delete();
    
    res.json({
      success: true,
      message: 'FAQ deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete FAQ',
    });
  }
});

export default router;
