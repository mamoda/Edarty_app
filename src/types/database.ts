// ============================================
// أنواع المستخدمين والمدرسة
// ============================================

// نوع المستخدم من Supabase (للتوافق مع الـ library)
export type SupabaseUser = import('@supabase/supabase-js').User;

// نوع المدرسة (للعلاقات)
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
  status: 'active' | 'suspended' | 'inactive';
  created_at: string;
  updated_at: string;
}

// نوع دور المستخدم في المدرسة
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
  user?: User;
}

// نوع المستخدم المخصص مع بيانات المدرسة
export interface CustomUser extends SupabaseUser {
  school_id?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  taxNumber?: string;
  full_name?: string;
  school?: School;
}

// نوع بيانات المدرسة (للاستخدام في الـ hooks)
export interface SchoolData {
  id?: string;
  schoolId?: string;
  schoolName: string;
  schoolEmail: string;
  schoolIdentifier: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolTaxNumber?: string;
}

// نوع المستخدم (لجدول users في قاعدة البيانات)
export interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  school_id?: string;
  school_name: string | null;
  school_address: string | null;
  school_phone: string | null;
  tax_number: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  permissions: any;
  last_login: string | null;
  is_active: boolean;
  avatar_url: string | null;
  department: string | null;
  school?: School;
}

// ============================================
// أنواع الطلاب (Students)
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
// أنواع الرسوم (Fees)
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
// أنواع المصروفات (Expenses)
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
// أنواع المعلمين (Teachers)
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
// أنواع رواتب المعلمين (Teacher Salaries)
// ============================================

export interface TeacherSalary {
  id: string;
  teacher_id: string;
  user_id: string;
  school_id: string;
  month: number;
  year: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  teacher?: Teacher;
  school?: School;
}

// ============================================
// أنواع الإحصائيات (Statistics)
// ============================================

export interface Statistics {
  totalStudents: number;
  activeStudents: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalTeachers?: number;
  activeTeachers?: number;
  totalSalaries?: number;
  pendingSalaries?: number;
  paidSalaries?: number;
  monthlySalaryCost?: number;
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
// أنواع مساعدة (Utility Types)
// ============================================

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