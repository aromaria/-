import express from 'express';
import themeService from './services/theme-service.js';

export const createRoutes = (app: express.Application) => {
  // Theme routes
  const themeRoutes = express.Router();
  themeRoutes.post('/', async (req, res) => {
    try {
      const { background, interests, targetAudience } = req.body;

      if (!background || !interests || !Array.isArray(interests)) {
        return res.status(400).json({
          error: 'Missing required fields: background, interests',
        });
      }

      // Generate theme using Claude API
      const theme = await themeService.generateTheme({
        userId: 'user_' + Date.now(), // TODO: Get from auth token
        background,
        interests,
        targetAudience: targetAudience || '初心者向け',
      });

      res.status(201).json(theme);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        error: 'Failed to generate theme',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  themeRoutes.get('/', (req, res) => {
    res.json({
      themes: [],
      total: 0,
      message: 'Fetch themes endpoint - coming soon',
    });
  });
  themeRoutes.get('/:id', (req, res) => {
    res.json({
      id: req.params.id,
      message: 'Fetch theme detail - coming soon',
    });
  });
  themeRoutes.delete('/:id', (req, res) => {
    res.status(204).send();
  });

  // Research routes
  const researchRoutes = express.Router();
  researchRoutes.post('/', (req, res) => {
    res.status(202).json({
      jobId: 'job_' + Date.now(),
      status: 'queued',
      message: 'Research execution - coming soon',
    });
  });
  researchRoutes.get('/:jobId', (req, res) => {
    res.json({
      jobId: req.params.jobId,
      status: 'processing',
      message: 'Fetch research results - coming soon',
    });
  });
  researchRoutes.get('/:jobId/progress', (req, res) => {
    res.json({
      status: 'in_progress',
      progress: 50,
      message: 'Research progress tracking - coming soon',
    });
  });

  // Content routes
  const contentRoutes = express.Router();
  contentRoutes.post('/', (req, res) => {
    res.status(202).json({
      articleId: 'article_' + Date.now(),
      jobId: 'job_' + Date.now(),
      status: 'queued',
      message: 'Article generation - coming soon',
    });
  });
  contentRoutes.get('/:articleId', (req, res) => {
    res.json({
      id: req.params.articleId,
      message: 'Fetch article - coming soon',
    });
  });
  contentRoutes.put('/:articleId', (req, res) => {
    res.json({
      id: req.params.articleId,
      message: 'Update article - coming soon',
    });
  });
  contentRoutes.delete('/:articleId', (req, res) => {
    res.status(204).send();
  });

  // Auth routes
  const authRoutes = express.Router();
  authRoutes.post('/google', (req, res) => {
    res.json({
      token: 'jwt_token_' + Date.now(),
      user: {
        id: 'user_' + Date.now(),
        email: 'user@example.com',
        name: 'User Name',
      },
      expiresIn: 3600,
      message: 'Google OAuth - coming soon',
    });
  });
  authRoutes.get('/me', (req, res) => {
    res.json({
      id: 'user_123',
      email: 'user@example.com',
      name: 'User Name',
      message: 'Current user endpoint - coming soon',
    });
  });
  authRoutes.post('/logout', (req, res) => {
    res.status(204).send();
  });

  // Mount routes
  app.use('/api/v1/themes', themeRoutes);
  app.use('/api/v1/research', researchRoutes);
  app.use('/api/v1/content', contentRoutes);
  app.use('/api/v1/auth', authRoutes);
};
