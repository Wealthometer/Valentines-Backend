import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase-service.js';
import { generateMatchSuggestions, dismissSuggestion } from '../services/matching-service.js';
import { validateRequired, validateUUID } from '../utils/validators.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

const router = Router();

/**
 * POST /connections/request
 * Send a connection request to another user
 */
router.post('/request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toUserId, message } = req.body;
    const fromUserId = req.userId;

    validateRequired(toUserId, 'To user ID');
    validateUUID(toUserId, 'User ID');

    if (fromUserId === toUserId) {
      throw new ValidationError('Cannot send request to yourself');
    }

    // Check if recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('users')
      .select('id')
      .eq('id', toUserId)
      .single();

    if (recipientError || !recipient) {
      throw new NotFoundError('Recipient not found');
    }

    // Check for existing request
    const { data: existingRequest } = await supabase
      .from('connection_requests')
      .select('id')
      .or(
        `and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`
      )
      .eq('status', 'pending');

    if (existingRequest && existingRequest.length > 0) {
      throw new ConflictError('Connection request already exists');
    }

    // Create request
    const { data: request, error: insertError } = await supabase
      .from('connection_requests')
      .insert([
        {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          request_type: 'manual_invite',
          message,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({
      id: request.id,
      status: 'pending',
      createdAt: request.created_at,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /connections/respond
 * Accept or reject a connection request
 */
router.post('/respond', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestId, accepted } = req.body;
    const userId = req.userId;

    validateRequired(requestId, 'Request ID');
    validateRequired(accepted, 'Accepted');
    validateUUID(requestId, 'Request ID');

    // Get the request
    const { data: request, error: requestError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .eq('to_user_id', userId)
      .single();

    if (requestError || !request) {
      throw new NotFoundError('Connection request not found');
    }

    // Update request status
    await supabase
      .from('connection_requests')
      .update({
        status: accepted ? 'accepted' : 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // If accepted, create couple record
    if (accepted) {
      const { error: coupleError } = await supabase
        .from('couples')
        .insert([
          {
            user1_id: request.from_user_id,
            user2_id: request.to_user_id,
            status: 'active',
          },
        ]);

      if (coupleError && !coupleError.message.includes('duplicate')) {
        console.error('Failed to create couple:', coupleError);
      }
    }

    res.json({
      status: accepted ? 'accepted' : 'rejected',
      respondedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /connections
 * Get user's connections and pending requests
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    // Get couple connections
    const { data: couples, error: coupleError } = await supabase
      .from('couples')
      .select(
        `
        id,
        user1_id,
        user2_id,
        matched_at,
        status,
        user1:user1_id(id, display_name, avatar_url),
        user2:user2_id(id, display_name, avatar_url)
      `
      )
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // Get pending requests
    const { data: pendingRequests, error: requestError } = await supabase
      .from('connection_requests')
      .select(
        `
        id,
        from_user_id,
        to_user_id,
        message,
        created_at,
        from_user:from_user_id(id, display_name, avatar_url),
        to_user:to_user_id(id, display_name, avatar_url)
      `
      )
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .eq('status', 'pending');

    res.json({
      couples: couples || [],
      pendingRequests: pendingRequests || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /matches/suggestions
 * Get algorithmic matching suggestions for the user
 */
router.get('/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    // Generate suggestions if user doesn't have enough
    const { data: suggestions, error: fetchError } = await supabase
      .from('matches_suggestions')
      .select(
        `
        id,
        suggested_match_id,
        compatibility_score,
        reason,
        created_at,
        suggested_user:suggested_match_id(id, display_name, avatar_url, interests)
      `
      )
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .order('compatibility_score', { ascending: false })
      .limit(10);

    if (fetchError) {
      throw fetchError;
    }

    // If not enough suggestions, generate new ones
    if (!suggestions || suggestions.length < 5) {
      await generateMatchSuggestions(userId, 10);

      // Fetch again
      const { data: newSuggestions } = await supabase
        .from('matches_suggestions')
        .select(
          `
          id,
          suggested_match_id,
          compatibility_score,
          reason,
          created_at,
          suggested_user:suggested_match_id(id, display_name, avatar_url, interests)
        `
        )
        .eq('user_id', userId)
        .is('dismissed_at', null)
        .order('compatibility_score', { ascending: false })
        .limit(10);

      res.json({
        suggestions: newSuggestions || [],
        count: newSuggestions?.length || 0,
      });
    } else {
      res.json({
        suggestions,
        count: suggestions.length,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /matches/dismiss
 * Dismiss a suggestion
 */
router.post('/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { suggestionId } = req.body;
    const userId = req.userId;

    validateRequired(suggestionId, 'Suggestion ID');
    validateUUID(suggestionId, 'Suggestion ID');

    await dismissSuggestion(userId || '', suggestionId);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
