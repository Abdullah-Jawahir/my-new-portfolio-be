import { Router, Response } from 'express';
import { db } from '../config/firebase';
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

export default router;
