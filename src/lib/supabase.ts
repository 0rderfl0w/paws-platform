import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Dog = {
  id: string;
  name: string;
  size: 'small' | 'medium' | 'large';
  sex: 'male' | 'female' | null;
  age: string;
  description: string;
  photo_url: string;
  is_adopted: boolean;
  created_at: string;
  updated_at: string;
};
