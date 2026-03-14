// types/user.ts
import { User as SupabaseUser } from '@supabase/supabase-js';

// نوع مخصص للمستخدم مع الخصائص الإضافية
export interface CustomUser extends SupabaseUser {
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  taxNumber?: string;
  full_name?: string;
}

// نوع بيانات المدرسة
export interface SchoolData {
  schoolName: string;
  schoolEmail: string;
  schoolIdentifier: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolTaxNumber?: string;
}