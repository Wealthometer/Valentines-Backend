import { Router, Request, Response, NextFunction } from 'express';
import { generateSuggestions } from '../services/ai-service.js';
import { validateRequired } from '../utils/validators.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

/**
 * POST /suggestions/dates
 * Generate date suggestions
 */
router.post('/dates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { preferences } = req.body;

    const suggestions = await generateSuggestions(userId || '', 'dates', preferences);

    res.json({
      type: 'dates',
      suggestions,
      count: suggestions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /suggestions/gifts
 * Generate gift suggestions
 */
router.post('/gifts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { preferences } = req.body;

    const suggestions = await generateSuggestions(userId || '', 'gifts', preferences);

    res.json({
      type: 'gifts',
      suggestions,
      count: suggestions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /suggestions/activities
 * Generate activity suggestions
 */
router.post('/activities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { preferences } = req.body;

    const suggestions = await generateSuggestions(userId || '', 'activities', preferences);

    res.json({
      type: 'activities',
      suggestions,
      count: suggestions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
