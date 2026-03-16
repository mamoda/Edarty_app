// ============================================
// أنواع المستخدمين والمدرسة
// ============================================

// نوع المستخدم من Supabase (للتوافق مع الـ library)
export type SupabaseUser = import('@supabase/supabase-js').User;

// نوع بيانات المدرسة (للاستخدام في الـ hooks)
export interface SchoolData {
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
  school_name: string | null;
  school_address: string | null;
  school_phone: string | null;
  tax_number: string | null;
  role: UserRole;
  permissions?: Record<string, boolean>;
  is_active: boolean;
  last_login?: string;
  avatar_url?: string | null;
  phone?: string | null;
  department?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// أنواع الطلاب (Students)
// ============================================

export interface Student {
  id: string;
  user_id: string;
  full_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  enrollment_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ============================================
// أنواع الرسوم (Fees)
// ============================================

export interface Fee {
  id: string;
  user_id: string;
  student_id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  academic_year: string;
  notes: string;
  created_at: string;
  student?: Student; // علاقة مع الطالب
}

// ============================================
// أنواع المصروفات (Expenses)
// ============================================

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  notes: string;
  created_at: string;
  teacher_id?: string | null;
}

// ============================================
// أنواع المعلمين (Teachers)
// ============================================

export interface Teacher {
  id: string;
  user_id: string;
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
}

// ============================================
// أنواع رواتب المعلمين (Teacher Salaries)
// ============================================

export interface TeacherSalary {
  id: string;
  teacher_id: string;
  user_id: string;
  month: number; // 1-12
  year: number;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_date: string | null;
  notes: string | null;
  created_at: string;
  teacher?: Teacher; // علاقة مع المعلم
}

// ============================================
// أنواع الإحصائيات (Statistics)
// ============================================

export interface Statistics {
  // إحصائيات أساسية
  totalStudents: number;
  activeStudents: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  
  // إحصائيات المعلمين
  totalTeachers?: number;
  activeTeachers?: number;
  totalSalaries?: number;
  pendingSalaries?: number;
  paidSalaries?: number;
  monthlySalaryCost?: number;
  
  // إحصائيات إضافية للرسوم
  totalRefunds?: number;
  netRevenue?: number;
  paidStudents?: number;
  partialPaidStudents?: number;
  unpaidStudents?: number;
  collectionRate?: number;
  
  // إحصائيات طرق الدفع
  cashPayments?: number;
  cardPayments?: number;
  bankTransferPayments?: number;
  checkPayments?: number;
  
  // إحصائيات زمنية
  todayCollections?: number;
  thisWeekCollections?: number;
  thisMonthCollections?: number;
}

// ============================================
// أنواع مساعدة (Utility Types)
// ============================================

// نوع لحالة التحميل
export interface LoadingState {
  loading: boolean;
  error: string | null;
}

// نوع للردود من API
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

// نوع للفلترة والبحث
export interface FilterOptions {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// نوع للترتيب
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================
// الأنواع الإضافية (Roles & Permissions)
// ============================================

export type UserRole = 'admin' | 'accountant' | 'moderator' | 'user' | 'teacher' | 'student' | 'parent';

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  created_at: string;
}

export interface UserPermissions {
  user_id: string;
  permission_id: string;
  granted_by?: string;
  granted_at: string;
  expires_at?: string;
  permission?: Permission;
}

export interface UserActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ============================================
// نوع المستخدم المخصص (للاستخدام في AuthContext)
// ============================================

export interface CustomUser extends SupabaseUser {
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  taxNumber?: string;
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
  permissions?: Record<string, boolean>;
}

// ============================================
// دوال مساعدة للتحقق من الصلاحيات
// ============================================

export function hasPermission(user: CustomUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true; // الأدمن عنده كل الصلاحيات
  
  // التحقق من الصلاحيات المخصصة
  return user.permissions?.[permission] || false;
}

export function hasAnyPermission(user: CustomUser | null, permissions: string[]): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  return permissions.some(p => user.permissions?.[p]);
}

export function hasAllPermissions(user: CustomUser | null, permissions: string[]): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  return permissions.every(p => user.permissions?.[p]);
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