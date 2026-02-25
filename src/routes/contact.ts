import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { sendContactNotification } from '../services/email';
import { z } from 'zod';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

// POST /api/contact - Submit contact form (public)
router.post('/', async (req, res: Response) => {
  try {
    const validation = contactSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid contact form data',
        details: validation.error.errors,
      });
      return;
    }

    const messageData = {
      ...validation.data,
      read: false,
      createdAt: new Date(),
    };

    const docRef = await db.collection('messages').add(messageData);

    // Send email notification (don't fail if email fails)
    try {
      await sendContactNotification(validation.data);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }
    
    res.status(201).json({
      success: true,
      data: { id: docRef.id },
      message: 'Message sent successfully! I\'ll get back to you soon.',
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again.',
    });
  }
});

// GET /api/messages - Get all messages (authenticated)
router.get('/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snapshot = await db.collection('messages')
      .orderBy('createdAt', 'desc')
      .get();

    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    const unreadCount = messages.filter(m => !(m as Record<string, unknown>).read).length;

    res.json({
      success: true,
      data: {
        messages,
        total: messages.length,
        unreadCount,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
    });
  }
});

// GET /api/messages/:id - Get single message (authenticated)
router.get('/messages/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const doc = await db.collection('messages').doc(id).get();

    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Message not found',
      });
      return;
    }

    const data = doc.data();

    res.json({
      success: true,
      data: {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message',
    });
  }
});

// PATCH /api/messages/:id/read - Mark message as read/unread (authenticated)
router.patch('/messages/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { read } = req.body;
    
    if (typeof read !== 'boolean') {
      res.status(400).json({
        success: false,
        error: 'Invalid read value',
      });
      return;
    }

    const doc = await db.collection('messages').doc(id).get();
    
    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Message not found',
      });
      return;
    }

    await db.collection('messages').doc(id).update({ read });
    
    res.json({
      success: true,
      message: `Message marked as ${read ? 'read' : 'unread'}`,
    });
  } catch (error) {
    console.error('Error updating message read status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message',
    });
  }
});

// DELETE /api/messages/:id - Delete message (authenticated)
router.delete('/messages/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    
    const doc = await db.collection('messages').doc(id).get();
    
    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Message not found',
      });
      return;
    }

    await db.collection('messages').doc(id).delete();
    
    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
    });
  }
});

// DELETE /api/messages - Delete multiple messages (authenticated)
router.delete('/messages', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid message IDs',
      });
      return;
    }

    const batch = db.batch();
    
    ids.forEach((id: string) => {
      const ref = db.collection('messages').doc(id);
      batch.delete(ref);
    });
    
    await batch.commit();
    
    res.json({
      success: true,
      message: `${ids.length} message(s) deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete messages',
    });
  }
});

// GET /api/messages/stats - Get message statistics (authenticated)
router.get('/messages/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const snapshot = await db.collection('messages').get();
    
    const messages = snapshot.docs.map(doc => doc.data());
    const total = messages.length;
    const unread = messages.filter(m => !m.read).length;
    const read = total - unread;

    res.json({
      success: true,
      data: {
        total,
        unread,
        read,
      },
    });
  } catch (error) {
    console.error('Error fetching message stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message statistics',
    });
  }
});

export default router;
