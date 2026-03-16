// services/permissionService.ts
import { supabase } from '../lib/supabase';
import { UserRole, Permission, UserPermissions } from '../types/database';

class PermissionService {
  
  // الحصول على صلاحيات المستخدم
  async getUserPermissions(userId: string): Promise<Record<string, boolean>> {
    try {
      // جلب دور المستخدم أولاً
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // إذا كان أدمن، كل الصلاحيات مفعلة
      if (user.role === 'admin') {
        return { '*': true };
      }

      // جلب الصلاحيات المخصصة
      const { data: permissions, error: permError } = await supabase
        .from('user_permissions')
        .select('permission:permissions(name)')
        .eq('user_id', userId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (permError) throw permError;

      // تحويل إلى object
      const permissionMap: Record<string, boolean> = {};
      permissions?.forEach(p => {
        if (p.permission) {
          permissionMap[(p.permission as any).name] = true;
        }
      });

      // إضافة صلاحيات حسب الدور
      this.addRoleBasedPermissions(user.role, permissionMap);

      return permissionMap;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {};
    }
  }

  // إضافة صلاحيات أساسية حسب الدور
  private addRoleBasedPermissions(role: UserRole, permissions: Record<string, boolean>) {
    switch (role) {
      case 'accountant':
        // المحاسب
        permissions['fees.view'] = true;
        permissions['fees.create'] = true;
        permissions['fees.reports'] = true;
        permissions['expenses.view'] = true;
        permissions['expenses.create'] = true;
        permissions['reports.view_financial'] = true;
        permissions['teachers.view'] = true;
        permissions['teachers.manage_salaries'] = true;
        break;

      case 'moderator':
        // المشرف
        permissions['students.view'] = true;
        permissions['students.create'] = true;
        permissions['students.edit'] = true;
        permissions['teachers.view'] = true;
        permissions['fees.view'] = true;
        permissions['expenses.view'] = true;
        permissions['reports.view_academic'] = true;
        break;

      case 'teacher':
        // المعلم
        permissions['students.view'] = true;
        permissions['attendance.create'] = true;
        permissions['attendance.view'] = true;
        permissions['exams.view'] = true;
        permissions['results.create'] = true;
        break;

      case 'student':
        // الطالب
        permissions['profile.view'] = true;
        permissions['fees.view'] = true;
        permissions['attendance.view'] = true;
        permissions['results.view'] = true;
        break;

      case 'parent':
        // ولي الأمر
        permissions['students.view_own'] = true;
        permissions['fees.view_own'] = true;
        permissions['attendance.view_own'] = true;
        permissions['results.view_own'] = true;
        break;
    }
  }

  // التحقق من صلاحية محددة
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions['*'] || permissions[permission] || false;
  }

  // منح صلاحية لمستخدم
  async grantPermission(
    userId: string,
    permissionId: string,
    grantedBy: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          permission_id: permissionId,
          granted_by: grantedBy,
          expires_at: expiresAt?.toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error granting permission:', error);
      return false;
    }
  }

  // سحب صلاحية
  async revokePermission(userId: string, permissionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('permission_id', permissionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error revoking permission:', error);
      return false;
    }
  }

  // الحصول على جميع الصلاحيات المتاحة
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('module', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting permissions:', error);
      return [];
    }
  }

  // الحصول على صلاحيات مستخدم معين (مفصلة)
  async getUserPermissionsDetailed(userId: string): Promise<UserPermissions[]> {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*, permission:permissions(*)')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user permissions detailed:', error);
      return [];
    }
  }
}

export const permissionService = new PermissionService();