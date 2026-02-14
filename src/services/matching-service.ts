import { supabase } from './supabase-service.js';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  interests: string[];
  relationship_status: string;
}

export interface MatchScore {
  userId: string;
  score: number;
  reason: string;
}

/**
 * Calculate compatibility score between two users
 */
export function calculateCompatibility(user1: UserProfile, user2: UserProfile): number {
  let score = 50; // Base score

  // Check relationship status compatibility
  if (user1.relationship_status === 'single' && user2.relationship_status === 'single') {
    score += 20;
  } else if (user1.relationship_status === 'looking' && user2.relationship_status === 'looking') {
    score += 15;
  }

  // Calculate shared interests
  const sharedInterests = user1.interests.filter((interest) =>
    user2.interests.includes(interest)
  );
  
  if (sharedInterests.length > 0) {
    score += Math.min(sharedInterests.length * 5, 25);
  }

  // Ensure score is between 0 and 100
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Get the reason why two users are matched
 */
export function getMatchReason(user1: UserProfile, user2: UserProfile, score: number): string {
  const reasons: string[] = [];

  const sharedInterests = user1.interests.filter((interest) =>
    user2.interests.includes(interest)
  );

  if (sharedInterests.length > 0) {
    reasons.push(`Share ${sharedInterests.length} interests`);
  }

  if (user1.relationship_status === 'single' && user2.relationship_status === 'single') {
    reasons.push('Both looking for connection');
  }

  if (score > 70) {
    reasons.push('Great compatibility');
  }

  return reasons.join(' • ') || 'Potential connection';
}

/**
 * Generate matching suggestions for a user
 */
export async function generateMatchSuggestions(userId: string, limit: number = 10): Promise<void> {
  try {
    // Get current user
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !currentUser) {
      throw new Error('User not found');
    }

    // Get all other users (excluding current user and those already connected)
    const { data: potentialMatches, error: matchError } = await supabase
      .from('users')
      .select('*')
      .neq('id', userId)
      .eq('relationship_status', 'single');

    if (matchError || !potentialMatches) {
      throw new Error('Failed to fetch potential matches');
    }

    // Check for existing suggestions and connections
    const { data: existingSuggestions } = await supabase
      .from('matches_suggestions')
      .select('suggested_match_id')
      .eq('user_id', userId)
      .is('dismissed_at', null);

    const { data: connections } = await supabase
      .from('couples')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    const existingIds = new Set<string>();
    if (existingSuggestions) {
      existingSuggestions.forEach((s) => existingIds.add(s.suggested_match_id));
    }
    if (connections) {
      connections.forEach((c) => {
        if (c.user1_id === userId) existingIds.add(c.user2_id);
        if (c.user2_id === userId) existingIds.add(c.user1_id);
      });
    }

    // Calculate scores and rank matches
    const scoredMatches: MatchScore[] = potentialMatches
      .filter((match) => !existingIds.has(match.id))
      .map((match) => {
        const score = calculateCompatibility(currentUser, match);
        const reason = getMatchReason(currentUser, match, score);
        return { userId: match.id, score, reason };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Insert new suggestions
    const suggestions = scoredMatches.map((match) => ({
      user_id: userId,
      suggested_match_id: match.userId,
      compatibility_score: match.score,
      reason: match.reason,
    }));

    if (suggestions.length > 0) {
      const { error: insertError } = await supabase
        .from('matches_suggestions')
        .insert(suggestions);

      if (insertError) {
        console.error('Failed to insert suggestions:', insertError);
      }
    }
  } catch (error) {
    console.error('Error generating match suggestions:', error);
  }
}

/**
 * Dismiss a suggestion
 */
export async function dismissSuggestion(userId: string, suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from('matches_suggestions')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', suggestionId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
