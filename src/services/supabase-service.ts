import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getUserById(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createUser(email: string, passwordHash: string, displayName: string) {
  const { data, error } = await supabase
    .from('users')
    .insert([
      {
        email,
        password_hash: passwordHash,
        display_name: displayName,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUser(userId: string, updates: Record<string, any>) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCoupleById(coupleId: string) {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('id', coupleId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getCoupleByUsers(userId1: string, userId2: string) {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .or(`and(user1_id.eq.${userId1},user2_id.eq.${userId2}),and(user1_id.eq.${userId2},user2_id.eq.${userId1})`)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createCouple(user1Id: string, user2Id: string) {
  const { data, error } = await supabase
    .from('couples')
    .insert([
      {
        user1_id: user1Id,
        user2_id: user2Id,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}
