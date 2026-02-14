import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase-service.js';
import { validateUUID, validateRequired, validateString } from '../utils/validators.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const router = Router();

/**
 * POST /cards
 * Create a new Valentine card
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const { coupleId, designTemplate, customization, recipientMessage } = req.body;

    validateRequired(designTemplate, 'Design template');
    validateString(designTemplate, 'Design template', 1, 100);

    // Create card
    const { data: card, error: insertError } = await supabase
      .from('valentine_cards')
      .insert([
        {
          user_id: userId,
          couple_id: coupleId,
          design_template: designTemplate,
          customization: customization || {},
          recipient_message: recipientMessage,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json(card);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cards
 * Get user's cards
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    const { data: cards, error: fetchError } = await supabase
      .from('valentine_cards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    res.json({
      cards: cards || [],
      total: cards?.length || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /cards/:cardId
 * Get a specific card
 */
router.get('/:cardId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params;
    const userId = req.userId;

    validateUUID(cardId, 'Card ID');

    const { data: card, error: fetchError } = await supabase
      .from('valentine_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !card) {
      throw new NotFoundError('Card not found');
    }

    res.json(card);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /cards/:cardId
 * Update a card
 */
router.put('/:cardId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params;
    const userId = req.userId;
    const { customization, recipientMessage } = req.body;

    validateUUID(cardId, 'Card ID');

    // Verify card ownership
    const { data: card } = await supabase
      .from('valentine_cards')
      .select('user_id')
      .eq('id', cardId)
      .single();

    if (!card || card.user_id !== userId) {
      throw new ValidationError('Access denied');
    }

    // Update card
    const { data: updated, error: updateError } = await supabase
      .from('valentine_cards')
      .update({
        customization,
        recipient_message: recipientMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /cards/:cardId
 * Delete a card
 */
router.delete('/:cardId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cardId } = req.params;
    const userId = req.userId;

    validateUUID(cardId, 'Card ID');

    // Verify card ownership
    const { data: card } = await supabase
      .from('valentine_cards')
      .select('user_id')
      .eq('id', cardId)
      .single();

    if (!card || card.user_id !== userId) {
      throw new ValidationError('Access denied');
    }

    // Delete card
    const { error: deleteError } = await supabase
      .from('valentine_cards')
      .delete()
      .eq('id', cardId);

    if (deleteError) {
      throw deleteError;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
