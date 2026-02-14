import { Router, Request, Response, NextFunction } from 'express';
import { generateLoveLetter, generateCardMessage, generateSuggestions } from '../services/ai-service.js';
import { validateRequired, validateString } from '../utils/validators.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

/**
 * POST /ai/love-letter
 * Generate a love letter with specified tone and theme
 */
router.post('/love-letter', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, tone = 'romantic', theme = 'classic' } = req.body;
    const userId = req.userId;

    // Validate input
    validateRequired(prompt, 'Prompt');
    validateString(prompt, 'Prompt', 10, 1000);

    if (tone && !['romantic', 'playful', 'poetic', 'passionate', 'tender'].includes(tone)) {
      throw new ValidationError('Invalid tone. Must be: romantic, playful, poetic, passionate, or tender');
    }

    if (theme && !['classic', 'modern', 'vintage', 'adventurous', 'humorous'].includes(theme)) {
      throw new ValidationError('Invalid theme. Must be: classic, modern, vintage, adventurous, or humorous');
    }

    const loveLetter = await generateLoveLetter(userId || '', prompt, tone, theme);

    res.json({
      loveLetter,
      tone,
      theme,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /ai/card-message
 * Generate a Valentine card message
 */
router.post('/card-message', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, tone = 'romantic' } = req.body;
    const userId = req.userId;

    // Validate input
    validateRequired(prompt, 'Prompt');
    validateString(prompt, 'Prompt', 5, 500);

    if (tone && !['romantic', 'playful', 'funny', 'heartfelt', 'silly'].includes(tone)) {
      throw new ValidationError('Invalid tone. Must be: romantic, playful, funny, heartfelt, or silly');
    }

    const message = await generateCardMessage(userId || '', prompt, tone);

    res.json({
      message,
      tone,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /ai/suggestions
 * Generate suggestions for dates, gifts, or activities
 */
router.post('/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, preferences } = req.body;
    const userId = req.userId;

    // Validate input
    validateRequired(type, 'Type');

    if (!['dates', 'gifts', 'activities'].includes(type)) {
      throw new ValidationError('Invalid type. Must be: dates, gifts, or activities');
    }

    const suggestions = await generateSuggestions(userId || '', type, preferences);

    res.json({
      type,
      suggestions,
      count: suggestions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
