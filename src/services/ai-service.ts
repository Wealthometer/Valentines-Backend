import OpenAI from 'openai';
import { supabase } from './supabase-service.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AIPurpose = 'love-letter' | 'card-message' | 'suggestions';

export interface AIGenerationParams {
  userId: string;
  prompt: string;
  purpose: AIPurpose;
  tone?: string;
  theme?: string;
}

/**
 * Generate a love letter using OpenAI
 */
export async function generateLoveLetter(
  userId: string,
  prompt: string,
  tone: string = 'romantic',
  theme: string = 'classic'
): Promise<string> {
  const systemPrompt = `You are a romantic love letter writer. Create heartfelt, personalized love letters based on the user's input. 
The tone should be: ${tone}
The theme should be: ${theme}
Write a meaningful letter (200-400 words) that feels genuine and touching.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.choices[0];
  if (!content || !content.message || content.message.content === null) {
    throw new Error('Failed to generate love letter');
  }

  // Log the generation
  await logAIGeneration(userId, 'love-letter', prompt, response.usage.prompt_tokens + response.usage.completion_tokens);

  return content.message.content;
}

/**
 * Generate a Valentine card message using OpenAI
 */
export async function generateCardMessage(
  userId: string,
  prompt: string,
  tone: string = 'romantic'
): Promise<string> {
  const systemPrompt = `You are a creative Valentine card message writer. Create short, sweet, and memorable messages for Valentine cards.
The tone should be: ${tone}
Keep the message concise (1-3 sentences) but meaningful and touching.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 256,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.choices[0];
  if (!content || !content.message || content.message.content === null) {
    throw new Error('Failed to generate card message');
  }

  // Log the generation
  await logAIGeneration(userId, 'card-message', prompt, response.usage.prompt_tokens + response.usage.completion_tokens);

  return content.message.content;
}

/**
 * Generate suggestions for dates, gifts, or activities
 */
export async function generateSuggestions(
  userId: string,
  type: 'dates' | 'gifts' | 'activities',
  preferences?: string
): Promise<string[]> {
  const prompts = {
    dates: `Suggest 5 unique, romantic date ideas for couples. Each should be creative and memorable. 
    ${preferences ? `Consider these preferences: ${preferences}` : ''}
    Format as a JSON array of strings.`,
    gifts: `Suggest 5 thoughtful, romantic gift ideas for a Valentine's Day gift. Each should be meaningful.
    ${preferences ? `Consider these preferences: ${preferences}` : ''}
    Format as a JSON array of strings.`,
    activities: `Suggest 5 fun couple activities that strengthen connection and create memories.
    ${preferences ? `Consider these preferences: ${preferences}` : ''}
    Format as a JSON array of strings.`,
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 512,
    system: `You are a romantic advisor. Generate creative suggestions as a JSON array of strings.`,
    messages: [
      {
        role: 'user',
        content: prompts[type],
      },
    ],
  });

  const content = response.choices[0];
  if (!content || !content.message || content.message.content === null) {
    throw new Error(`Failed to generate ${type} suggestions`);
  }

  // Log the generation
  await logAIGeneration(userId, 'suggestions', prompts[type], response.usage.prompt_tokens + response.usage.completion_tokens);

  // Parse JSON response
  try {
    const jsonMatch = content.message.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse suggestions:', error);
    // Return the text split by newlines if JSON parsing fails
    return content.message.content.split('\n').filter((line) => line.trim().length > 0);
  }
}

/**
 * Log AI generation for usage tracking
 */
async function logAIGeneration(
  userId: string,
  type: AIPurpose,
  prompt: string,
  tokens: number
): Promise<void> {
  try {
    await supabase.from('ai_generation_history').insert([
      {
        user_id: userId,
        type,
        prompt: prompt.substring(0, 500), // Truncate for storage
        ai_model: 'claude-opus-4-20250805',
        usage_tokens: tokens,
      },
    ]);
  } catch (error) {
    console.error('Failed to log AI generation:', error);
  }
}
