// src/types/database.ts

// ============================================
// Types متوافقة مع Supabase Auth
// ============================================

export interface AuthUser {
  id: string;
  email?: string | null;
}

// ============================================
// School
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

// ============================================
// User Profile (public.users)
// ============================================

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  school_id: string | null;
  school_name: string | null;
  school_address: string | null;
  school_phone: string | null;
  tax_number: string | null;
  role: string;
  permissions: Record<string, any>;
  last_login: string | null;
  is_active: boolean;
  avatar_url: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// User Roles
// ============================================

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
}

// ============================================
// Students
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

// ============================================
// Teachers
// ============================================

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

// ============================================
// Fees
// ============================================

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

// ============================================
// Expenses
// ============================================

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

// ============================================
// Activity Logs
// ============================================

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
}

// ============================================
// Subscriptions
// ============================================

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
}

// ============================================
// Payments
// ============================================

export interface Payment {
  id: string;
  school_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  transaction_id: string | null;
  payment_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Plans
// ============================================

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
  updated_at: string;
}

// ============================================
// Notifications
// ============================================

export interface Notification {
  id: string;
  user_id: string;
  school_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link: string | null;
  created_at: string;
}

// ============================================
// Permissions
// ============================================

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  created_at: string;
  school_id: string | null;
}

export interface UserPermission {
  user_id: string;
  permission_id: string;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  school_id: string;
}

// ============================================
// Teacher Salaries
// ============================================

export interface TeacherSalary {
  id: string;
  teacher_id: string | null;
  user_id: string;
  month: number;
  year: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  school_id: string;
}

// ============================================
// Helper Types
// ============================================

export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface LoadingState {
  loading: boolean;
  error: string | null;
}
