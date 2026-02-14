import { Router, Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabase-service.js';
import { updateUser, getUserById } from '../services/supabase-service.js';
import { validateString } from '../utils/validators.js';

const router = Router();

/**
 * GET /user/profile
 * Get current user's profile
 */
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    const user = await getUserById(userId || '');

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      pronouns: user.pronouns,
      bio: user.bio,
      interests: user.interests,
      favoriteColors: user.favorite_colors,
      relationshipStatus: user.relationship_status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /user/profile
 * Update user's profile
 */
router.put('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const {
      displayName,
      pronouns,
      bio,
      interests,
      favoriteColors,
      relationshipStatus,
    } = req.body;

    // Validate inputs
    if (displayName) {
      validateString(displayName, 'Display name', 2, 100);
    }

    if (bio) {
      validateString(bio, 'Bio', 0, 500);
    }

    // Update user
    const updated = await updateUser(userId || '', {
      display_name: displayName,
      pronouns,
      bio,
      interests,
      favorite_colors: favoriteColors,
      relationship_status: relationshipStatus,
      updated_at: new Date().toISOString(),
    });

    res.json({
      id: updated.id,
      email: updated.email,
      displayName: updated.display_name,
      avatarUrl: updated.avatar_url,
      pronouns: updated.pronouns,
      bio: updated.bio,
      interests: updated.interests,
      favoriteColors: updated.favorite_colors,
      relationshipStatus: updated.relationship_status,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
