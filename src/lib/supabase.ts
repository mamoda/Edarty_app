// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// عرض المتغيرات للتأكد (للتطوير فقط)
console.log('Environment Variables Check:');
console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Present' : '❌ Missing');
console.log('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY:', supabaseAnonKey ? '✅ Present' : '❌ Missing');
console.log('VITE_SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Present' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Client عادي للمستخدمين
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage
  }
});

// Client خاص بـ Admin (بـ service role key)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// تحذير إذا لم يكن supabaseAdmin متاحاً
if (!supabaseAdmin) {
  console.warn('⚠️ Supabase Admin client not available. User management features will be disabled.');
}