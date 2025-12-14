import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug: Log environment variable loading (only in development)
if (__DEV__) {
  console.log('🔍 Supabase Config Check:');
  console.log('  URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ MISSING');
  console.log('  Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '❌ MISSING');
  console.log('  All env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('   Make sure .env file exists in project root with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.error('   Restart Expo with: npx expo start --clear');
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
