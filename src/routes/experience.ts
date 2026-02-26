import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { z } from 'zod';

const router = Router();

// Schemas
const workExperienceSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  location: z.string().max(100),
  period: z.string().max(100),
  type: z.string().max(50),
  description: z.string().max(2000),
  responsibilities: z.array(z.string()),
  technologies: z.array(z.string()),
  order: z.number().int().min(0),
});

const certificationSchema = z.object({
  title: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  date: z.string().max(50),
  credentialUrl: z.string().optional(),
  order: z.number().int().min(0),
});

const coreValueSchema = z.object({
  icon: z.string().max(50),
  title: z.string().min(1).max(100),
  description: z.string().max(500),
  order: z.number().int().min(0),
});

const interestSchema = z.object({
  icon: z.string().max(50),
  label: z.string().min(1).max(50),
  order: z.number().int().min(0),
});

const learningGoalSchema = z.object({
  name: z.string().min(1).max(100),
  progress: z.number().int().min(0).max(100),
  order: z.number().int().min(0),
});

const funFactSchema = z.object({
  emoji: z.string().max(10),
  fact: z.string().min(1).max(200),
  order: z.number().int().min(0),
});

// GET /api/experience - Get all experience data
router.get('/', async (req, res: Response) => {
  try {
    const [
      workExperienceSnapshot,
      certificationsSnapshot,
      coreValuesSnapshot,
      interestsSnapshot,
      learningGoalsSnapshot,
      funFactsSnapshot
    ] = await Promise.all([
      db.collection('workExperience').orderBy('order').get(),
      db.collection('certifications').orderBy('order').get(),
      db.collection('coreValues').orderBy('order').get(),
      db.collection('interests').orderBy('order').get(),
      db.collection('learningGoals').orderBy('order').get(),
      db.collection('funFacts').orderBy('order').get(),
    ]);

    const workExperience = workExperienceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const certifications = certificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const coreValues = coreValuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const interests = interestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const learningGoals = learningGoalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const funFacts = funFactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      data: {
        workExperience,
        certifications,
        coreValues,
        interests,
        learningGoals,
        funFacts,
      },
    });
  } catch (error) {
    console.error('Error fetching experience data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch experience data',
    });
  }
});

// Work Experience CRUD
router.post('/work', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = workExperienceSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid work experience data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('workExperience').add({
      ...validation.data,
      createdAt: new Date(),
    });
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Work experience created successfully',
    });
  } catch (error) {
    console.error('Error creating work experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create work experience',
    });
  }
});

router.put('/work/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = workExperienceSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid work experience data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('workExperience').doc(id).update({
      ...validation.data,
      updatedAt: new Date(),
    });
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Work experience updated successfully',
    });
  } catch (error) {
    console.error('Error updating work experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update work experience',
    });
  }
});

router.delete('/work/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('workExperience').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Work experience deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting work experience:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete work experience',
    });
  }
});

// Certifications CRUD
router.post('/certifications', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = certificationSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid certification data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('certifications').add({
      ...validation.data,
      createdAt: new Date(),
    });
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Certification created successfully',
    });
  } catch (error) {
    console.error('Error creating certification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create certification',
    });
  }
});

router.put('/certifications/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = certificationSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid certification data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('certifications').doc(id).update({
      ...validation.data,
      updatedAt: new Date(),
    });
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Certification updated successfully',
    });
  } catch (error) {
    console.error('Error updating certification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update certification',
    });
  }
});

router.delete('/certifications/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('certifications').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Certification deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting certification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete certification',
    });
  }
});

// Core Values CRUD
router.post('/core-values', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = coreValueSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid core value data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('coreValues').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Core value created successfully',
    });
  } catch (error) {
    console.error('Error creating core value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create core value',
    });
  }
});

router.put('/core-values/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = coreValueSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid core value data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('coreValues').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Core value updated successfully',
    });
  } catch (error) {
    console.error('Error updating core value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update core value',
    });
  }
});

router.delete('/core-values/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('coreValues').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Core value deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting core value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete core value',
    });
  }
});

// Interests CRUD
router.post('/interests', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = interestSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid interest data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('interests').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Interest created successfully',
    });
  } catch (error) {
    console.error('Error creating interest:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create interest',
    });
  }
});

router.put('/interests/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = interestSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid interest data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('interests').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Interest updated successfully',
    });
  } catch (error) {
    console.error('Error updating interest:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update interest',
    });
  }
});

router.delete('/interests/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('interests').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Interest deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting interest:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete interest',
    });
  }
});

// Learning Goals CRUD
router.post('/learning-goals', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = learningGoalSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid learning goal data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('learningGoals').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Learning goal created successfully',
    });
  } catch (error) {
    console.error('Error creating learning goal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create learning goal',
    });
  }
});

router.put('/learning-goals/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = learningGoalSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid learning goal data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('learningGoals').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Learning goal updated successfully',
    });
  } catch (error) {
    console.error('Error updating learning goal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update learning goal',
    });
  }
});

router.delete('/learning-goals/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('learningGoals').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Learning goal deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting learning goal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete learning goal',
    });
  }
});

// Fun Facts CRUD
router.post('/fun-facts', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = funFactSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid fun fact data',
        details: validation.error.errors,
      });
      return;
    }

    const docRef = await db.collection('funFacts').add(validation.data);
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id, ...validation.data },
      message: 'Fun fact created successfully',
    });
  } catch (error) {
    console.error('Error creating fun fact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create fun fact',
    });
  }
});

router.put('/fun-facts/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = funFactSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid fun fact data',
        details: validation.error.errors,
      });
      return;
    }

    await db.collection('funFacts').doc(id).update(validation.data);
    
    res.json({
      success: true,
      data: { id, ...validation.data },
      message: 'Fun fact updated successfully',
    });
  } catch (error) {
    console.error('Error updating fun fact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update fun fact',
    });
  }
});

router.delete('/fun-facts/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('funFacts').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Fun fact deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting fun fact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete fun fact',
    });
  }
});

export default router;
