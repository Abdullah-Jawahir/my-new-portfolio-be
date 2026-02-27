import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { corsMiddleware } from './middleware/cors';

import profileRoutes from './routes/profile';
import skillsRoutes from './routes/skills';
import projectsRoutes from './routes/projects';
import educationRoutes from './routes/education';
import experienceRoutes from './routes/experience';
import faqsRoutes from './routes/faqs';
import contactRoutes from './routes/contact';
import messagesRoutes from './routes/messages';
import filesRoutes from './routes/files';
import adminRoutes from './routes/admin';
import techDataRoutes from './routes/techData';
import teamRoutes from './routes/team';
import requestsRoutes from './routes/requests';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(corsMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});
app.use(limiter);

// Stricter rate limit for contact form - respects Resend's 2 req/sec limit
const contactLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 3, // 3 submissions per minute (well under Resend's 2/sec)
  message: {
    success: false,
    error: 'Too many contact form submissions. Please wait a minute and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio API is running',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/experience', experienceRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/contact', contactLimiter, contactRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/tech-data', techDataRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/requests', requestsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

// Start server (for local development)
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
