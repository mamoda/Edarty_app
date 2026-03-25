// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton pattern - يضمن وجود instance واحد فقط
class SupabaseManager {
  private static instance: SupabaseClient | null = null;
  private static initializationPromise: Promise<SupabaseClient> | null = null;

  private constructor() {}

  public static async getInstance(): Promise<SupabaseClient> {
    if (this.instance) {
      return this.instance;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        this.instance = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'supabase-auth',
            storage: {
              getItem: (key) => {
                try {
                  return localStorage.getItem(key);
                } catch {
                  return null;
                }
              },
              setItem: (key, value) => {
                try {
                  localStorage.setItem(key, value);
                } catch {
                  // Ignore
                }
              },
              removeItem: (key) => {
                try {
                  localStorage.removeItem(key);
                } catch {
                  // Ignore
                }
              },
            },
          },
        });
        return this.instance;
      } catch (error) {
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  public static reset(): void {
    this.instance = null;
    this.initializationPromise = null;
  }
}

// Export async function للحصول على الـ client
export const getSupabase = () => SupabaseManager.getInstance();

// Export sync version للاستخدام بعد التهيئة (للتوافق مع الكود الحالي)
// هذا سيعمل بشكل متزامن بعد تهيئة الـ client
let syncClient: SupabaseClient | null = null;

// تهيئة متزامنة للاستخدام الفوري
(async () => {
  syncClient = await SupabaseManager.getInstance();
})();

export const supabase = new Proxy({} as SupabaseClient, {
  get: (_, prop) => {
    if (!syncClient) {
      throw new Error('Supabase client not initialized yet. Use await getSupabase() instead.');
    }
    const value = (syncClient as any)[prop];
    return typeof value === 'function' ? value.bind(syncClient) : value;
  },
});