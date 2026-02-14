import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase-service.js';
import { validateUUID, validateRequired, validateString } from '../utils/validators.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const router = Router();

/**
 * GET /couple/:coupleId
 * Get couple information
 */
router.get('/:coupleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { coupleId } = req.params;
    const userId = req.userId;

    validateUUID(coupleId, 'Couple ID');

    // Get couple and verify user is part of it
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select(
        `
        id,
        user1_id,
        user2_id,
        matched_at,
        status,
        anniversary_date,
        relationship_start_date,
        custom_notes,
        user1:user1_id(id, display_name, avatar_url),
        user2:user2_id(id, display_name, avatar_url)
      `
      )
      .eq('id', coupleId)
      .single();

    if (coupleError || !couple) {
      throw new NotFoundError('Couple not found');
    }

    // Verify user is part of couple
    if (couple.user1_id !== userId && couple.user2_id !== userId) {
      throw new ValidationError('Access denied');
    }

    res.json(couple);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /couple/:coupleId
 * Update couple information
 */
router.put('/:coupleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { coupleId } = req.params;
    const userId = req.userId;
    const { anniversaryDate, relationshipStartDate, customNotes } = req.body;

    validateUUID(coupleId, 'Couple ID');

    // Get couple and verify user is part of it
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single();

    if (coupleError || !couple) {
      throw new NotFoundError('Couple not found');
    }

    if (couple.user1_id !== userId && couple.user2_id !== userId) {
      throw new ValidationError('Access denied');
    }

    // Update couple
    const { data: updated, error: updateError } = await supabase
      .from('couples')
      .update({
        anniversary_date: anniversaryDate,
        relationship_start_date: relationshipStartDate,
        custom_notes: customNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', coupleId)
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
 * GET /couple/:coupleId/notes
 * Get couple's shared notes
 */
router.get('/:coupleId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { coupleId } = req.params;
    const userId = req.userId;

    validateUUID(coupleId, 'Couple ID');

    // Verify user is part of couple
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single();

    if (!couple || (couple.user1_id !== userId && couple.user2_id !== userId)) {
      throw new ValidationError('Access denied');
    }

    // In a full implementation, you'd have a separate notes table
    // For now, return the couple's custom notes
    const { data: coupleData } = await supabase
      .from('couples')
      .select('custom_notes')
      .eq('id', coupleId)
      .single();

    res.json({
      notes: coupleData?.custom_notes || '',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /couple/:coupleId/notes
 * Add or update shared note
 */
router.post('/:coupleId/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { coupleId } = req.params;
    const userId = req.userId;
    const { note } = req.body;

    validateUUID(coupleId, 'Couple ID');
    validateRequired(note, 'Note');
    validateString(note, 'Note', 1, 5000);

    // Verify user is part of couple
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id, custom_notes')
      .eq('id', coupleId)
      .single();

    if (!couple || (couple.user1_id !== userId && couple.user2_id !== userId)) {
      throw new ValidationError('Access denied');
    }

    // Append note to custom notes
    const updatedNotes = couple.custom_notes ? `${couple.custom_notes}\n\n${note}` : note;

    const { error: updateError } = await supabase
      .from('couples')
      .update({
        custom_notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', coupleId);

    if (updateError) {
      throw updateError;
    }

    res.status(201).json({
      note,
      addedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /couple/:coupleId/calendar
 * Get couple's calendar events
 */
router.get('/:coupleId/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { coupleId } = req.params;
    const userId = req.userId;

    validateUUID(coupleId, 'Couple ID');

    // Verify user is part of couple
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single();

    if (!couple || (couple.user1_id !== userId && couple.user2_id !== userId)) {
      throw new ValidationError('Access denied');
    }

    // Get calendar events
    const { data: events, error: eventsError } = await supabase
      .from('couple_calendar')
      .select('*')
      .eq('couple_id', coupleId)
      .order('event_date', { ascending: true });

    if (eventsError) {
      throw eventsError;
    }

    res.json({
      events: events || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /couple/:coupleId/calendar
 * Add calendar event
 */
router.post('/:coupleId/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { coupleId } = req.params;
    const userId = req.userId;
    const { title, description, eventDate, eventTime, category } = req.body;

    validateUUID(coupleId, 'Couple ID');
    validateRequired(title, 'Title');
    validateString(title, 'Title', 1, 255);
    validateRequired(eventDate, 'Event date');

    // Verify user is part of couple
    const { data: couple } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .eq('id', coupleId)
      .single();

    if (!couple || (couple.user1_id !== userId && couple.user2_id !== userId)) {
      throw new ValidationError('Access denied');
    }

    // Add event
    const { data: event, error: insertError } = await supabase
      .from('couple_calendar')
      .insert([
        {
          couple_id: coupleId,
          created_by_id: userId,
          title,
          description,
          event_date: eventDate,
          event_time: eventTime,
          category,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

export default router;
