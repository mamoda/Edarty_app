// src/types/database.ts
import { User as SupabaseUser } from '@supabase/supabase-js';

// ============================================
// أنواع متوافقة مع Schema قاعدة البيانات
// ============================================

export interface School {
  id: string;
  name: string;
  subdomain: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  settings: Record<string, any>;
  status: 'active' | 'suspended' | 'inactive' | 'trial';
  subscription_plan: 'free' | 'basic' | 'pro' | 'enterprise';
  subscription_expires_at: string | null;
  subscription_status: 'active' | 'expired' | 'canceled' | 'trialing';
  max_students: number;
  max_teachers: number;
  max_users: number;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  school_id: string | null;
  school_name: string | null;
  school_address: string | null;
  school_phone: string | null;
  tax_number: string | null;
  role: string | null;
  permissions: any;
  last_login: string | null;
  is_active: boolean;
  avatar_url: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSchoolRole {
  id: string;
  user_id: string;
  school_id: string;
  role: 'admin' | 'accountant' | 'moderator' | 'teacher' | 'parent';
  permissions: string[];
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  school?: School;
  user?: CustomUser;
}

// ✅ إصلاح CustomUser - إزالة role لأن Supabase User لا يحتوي عليها
export interface CustomUser extends SupabaseUser {
  school_id?: string;
  full_name?: string;
  school_name?: string | null;
  school_address?: string | null;
  school_phone?: string | null;
  tax_number?: string | null;
}

export interface SchoolData {
  id?: string;
  schoolId?: string;
  schoolName: string;
  schoolEmail: string;
  schoolIdentifier: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolTaxNumber?: string;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
  features?: string[];
}

// ============================================
// أنواع الجداول الأخرى
// ============================================

export interface Student {
  id: string;
  user_id: string;
  school_id: string;
  full_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  enrollment_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  school?: School;
}

export interface Teacher {
  id: string;
  user_id: string;
  school_id: string;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  salary: number;
  hire_date: string;
  status: 'active' | 'inactive';
  address?: string | null;
  qualifications?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  school?: School;
}

export interface Fee {
  id: string;
  user_id: string;
  student_id: string;
  school_id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  academic_year: string;
  notes: string;
  created_at: string;
  student?: Student;
  school?: School;
}

export interface Expense {
  id: string;
  user_id: string;
  school_id: string;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  notes: string;
  created_at: string;
  teacher_id?: string | null;
  school?: School;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  school_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: CustomUser;
  school?: School;
}

export interface Subscription {
  id: string;
  school_id: string;
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  status: 'active' | 'expired' | 'canceled' | 'trialing';
  starts_at: string;
  expires_at: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  transaction_id: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  school?: School;
}

export interface Payment {
  id: string;
  school_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  transaction_id: string;
  payment_date: string;
  notes: string | null;
  created_at: string;
  school?: School;
  subscription?: Subscription;
}

export interface Plan {
  id: string;
  name: string;
  key: 'free' | 'basic' | 'pro' | 'enterprise';
  price_monthly: number;
  price_yearly: number;
  max_students: number;
  max_teachers: number;
  max_users: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface Statistics {
  totalStudents: number;
  activeStudents: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTeachers?: number;
  activeTeachers?: number;
  totalSalaries?: number;
  totalRefunds?: number;
  netRevenue?: number;
  paidStudents?: number;
  partialPaidStudents?: number;
  unpaidStudents?: number;
  collectionRate?: number;
  cashPayments?: number;
  cardPayments?: number;
  bankTransferPayments?: number;
  checkPayments?: number;
  todayCollections?: number;
  thisWeekCollections?: number;
  thisMonthCollections?: number;
}

// ============================================
// أنواع مساعدة
// ============================================

export type UserProfileRow = UserProfile;
export type UserSchoolRoleWithSchool = UserSchoolRole & { school: School };
export type UserProfileResponse = UserProfileRow | null;
export type UserRolesResponse = UserSchoolRoleWithSchool[];

export interface LoadingState {
  loading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface FilterOptions {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================
// دوال مساعدة للأنواع (Type Guards)
// ============================================

export function isStudent(obj: any): obj is Student {
  return obj && typeof obj === 'object' && 'grade' in obj && 'parent_name' in obj;
}

export function isTeacher(obj: any): obj is Teacher {
  return obj && typeof obj === 'object' && 'specialization' in obj && 'salary' in obj;
}

export function isFee(obj: any): obj is Fee {
  return obj && typeof obj === 'object' && 'amount' in obj && 'payment_type' in obj;
}

export function isSchool(obj: any): obj is School {
  return obj && typeof obj === 'object' && 'name' in obj && 'subdomain' in obj;
}