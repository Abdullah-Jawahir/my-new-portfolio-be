import { Router, Response } from 'express';
import { db } from '../config/firebase';
import { authenticateWithPermissions, requirePermission } from '../middleware/permissions';
import { AuthenticatedRequestWithPermissions } from '../types';
import { sendReplyEmail, sendReplyEmailWithNodemailer } from '../services/email';
import { z } from 'zod';

const router = Router();

const replySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(10000),
  originalMessageId: z.string().optional(),
  provider: z.enum(['resend', 'nodemailer']).optional().default('resend'),
});

// GET /api/messages - Get all messages (requires VIEW permission)
router.get('/', authenticateWithPermissions, requirePermission('messages', 'VIEW'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
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

// GET /api/messages/stats - Get message statistics (requires VIEW permission)
router.get('/stats', authenticateWithPermissions, requirePermission('messages', 'VIEW'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
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

// GET /api/messages/:id - Get single message (requires VIEW permission)
router.get('/:id', authenticateWithPermissions, requirePermission('messages', 'VIEW'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
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

// PATCH /api/messages/:id/read - Mark message as read/unread (requires UPDATE permission)
router.patch('/:id/read', authenticateWithPermissions, requirePermission('messages', 'UPDATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
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

// POST /api/messages/:id/reply - Send reply email (requires CREATE permission for replies)
router.post('/:id/reply', authenticateWithPermissions, requirePermission('messages', 'CREATE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
  try {
    const id = req.params.id as string;
    const validation = replySchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid reply data',
        details: validation.error.errors,
      });
      return;
    }

    const { to, subject, message, provider } = validation.data;

    // Get the original message to include context
    const doc = await db.collection('messages').doc(id).get();
    if (!doc.exists) {
      res.status(404).json({
        success: false,
        error: 'Original message not found',
      });
      return;
    }

    const originalMessage = doc.data();

    const emailData = {
      to,
      subject,
      message,
      originalMessage: originalMessage ? {
        name: originalMessage.name,
        email: originalMessage.email,
        subject: originalMessage.subject,
        message: originalMessage.message,
        createdAt: originalMessage.createdAt?.toDate?.() || originalMessage.createdAt,
      } : undefined,
    };

    // Send the reply email using selected provider
    if (provider === 'nodemailer') {
      await sendReplyEmailWithNodemailer(emailData);
    } else {
      await sendReplyEmail(emailData);
    }

    // Store the reply in the database for record keeping
    await db.collection('sentReplies').add({
      originalMessageId: id,
      to,
      subject,
      message,
      sentAt: new Date(),
      sentBy: req.user?.email,
      provider: provider || 'resend',
    });

    res.json({
      success: true,
      message: 'Reply sent successfully',
    });
  } catch (error: unknown) {
    console.error('Error sending reply:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send reply. Please try again.';
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// DELETE /api/messages/:id - Delete message (requires DELETE permission)
router.delete('/:id', authenticateWithPermissions, requirePermission('messages', 'DELETE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
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

// DELETE /api/messages - Delete multiple messages (requires DELETE permission)
router.delete('/', authenticateWithPermissions, requirePermission('messages', 'DELETE'), async (req: AuthenticatedRequestWithPermissions, res: Response) => {
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

export default router;
