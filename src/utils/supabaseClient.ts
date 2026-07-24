/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if Supabase is properly configured with custom credentials
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  supabaseUrl !== 'https://seu-projeto-id.supabase.co' && 
  !!supabaseAnonKey && 
  supabaseAnonKey !== 'sua-chave-anon-publica-aqui';

// Initialize the client. If not configured, we return null to fall back to mock data
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
