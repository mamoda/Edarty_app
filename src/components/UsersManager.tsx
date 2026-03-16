// components/UsersManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  Shield,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  X,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types/database';
import { permissionService } from '../services/permissionService';

interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  created_at: string;
}

export default function UsersManager() {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // نموذج المستخدم
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'user' as UserRole,
    department: '',
    is_active: true,
  });

  useEffect(() => {
    loadUsers();
    loadAllPermissions();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setError(error.message || 'حدث خطأ في تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const loadAllPermissions = async () => {
    try {
      const perms = await permissionService.getAllPermissions();
      setAllPermissions(perms);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      const perms = await permissionService.getUserPermissionsDetailed(userId);
      setUserPermissions(new Set(perms.map(p => p.permission_id)));
    } catch (error) {
      console.error('Error loading user permissions:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setError(null);
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role,
      department: user.department || '',
      is_active: user.is_active,
    });
    setShowForm(true);
  };

  const handleManagePermissions = (user: User) => {
    setError(null);
    setSelectedUser(user);
    loadUserPermissions(user.id);
    setShowRoleModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    setError(null);

    try {
      // تحضير البيانات - إزالة الحقول الفاضية
      const updateData: Record<string, any> = {
        full_name: formData.full_name,
        role: formData.role,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      // إضافة الحقول الاختيارية فقط إذا كانت موجودة
      if (formData.phone?.trim()) updateData.phone = formData.phone.trim();
      if (formData.department?.trim()) updateData.department = formData.department.trim();

      // التحقق من صحة الـ role
      const validRoles: UserRole[] = ['admin', 'accountant', 'moderator', 'user', 'teacher', 'student', 'parent'];
      if (!validRoles.includes(formData.role)) {
        setError('دور غير صالح');
        return;
      }

      console.log('📤 Updating user with data:', updateData);

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (updateError) throw updateError;

      console.log('✅ User updated successfully');
      await loadUsers();
      setShowForm(false);
      setEditingUser(null);
    } catch (error: any) {
      console.error('Error saving user:', error);
      setError(error.message || 'حدث خطأ في حفظ المستخدم');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermission = async (permissionId: string) => {
    if (!selectedUser || !currentUser) return;

    try {
      const hasPerm = userPermissions.has(permissionId);

      if (hasPerm) {
        // سحب الصلاحية
        const success = await permissionService.revokePermission(selectedUser.id, permissionId);
        if (success) {
          setUserPermissions(prev => {
            const newSet = new Set(prev);
            newSet.delete(permissionId);
            return newSet;
          });
        }
      } else {
        // منح الصلاحية
        const success = await permissionService.grantPermission(
          selectedUser.id,
          permissionId,
          currentUser.id
        );
        if (success) {
          setUserPermissions(prev => new Set([...prev, permissionId]));
        }
      }
    } catch (error) {
      console.error('Error toggling permission:', error);
      setError('حدث خطأ في تعديل الصلاحية');
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-purple-100 text-purple-800',
      accountant: 'bg-green-100 text-green-800',
      moderator: 'bg-blue-100 text-blue-800',
      teacher: 'bg-orange-100 text-orange-800',
      student: 'bg-yellow-100 text-yellow-800',
      parent: 'bg-indigo-100 text-indigo-800',
      user: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleName = (role: UserRole): string => {
    const names: Record<UserRole, string> = {
      admin: 'مدير النظام',
      accountant: 'محاسب',
      moderator: 'مشرف',
      teacher: 'معلم',
      student: 'طالب',
      parent: 'ولي أمر',
      user: 'مستخدم',
    };
    return names[role] || 'مستخدم';
  };

  if (!hasPermission('users.view')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">ليس لديك صلاحية لعرض هذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h2>
          <p className="text-sm text-gray-600">إدارة المستخدمين والأدوار والصلاحيات</p>
        </div>
        {hasPermission('users.create') && (
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                email: '',
                full_name: '',
                phone: '',
                role: 'user',
                department: '',
                is_active: true,
              });
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
          >
            <UserPlus className="w-5 h-5" />
            <span>مستخدم جديد</span>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="mr-auto">
            <X className="w-4 h-4 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث عن مستخدم..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">لا يوجد مستخدمين</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{user.full_name || 'غير محدد'}</h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {getRoleName(user.role)}
                    </span>
                    {!user.is_active && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        غير نشط
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {user.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.department && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>{user.department}</span>
                      </div>
                    )}
                    {user.last_login && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>آخر دخول: {new Date(user.last_login).toLocaleDateString('ar-EG')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {hasPermission('users.edit') && (
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('users.manage_roles') && (
                    <button
                      onClick={() => handleManagePermissions(user)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="إدارة الصلاحيات"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('users.delete') && user.id !== currentUser?.id && (
                    <button
                      onClick={() => {
                        // TODO: Implement delete
                        if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
                          // Delete logic
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingUser ? 'تعديل مستخدم' : 'مستخدم جديد'}
                </h3>
                <button onClick={() => setShowForm(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الدور
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="user">مستخدم</option>
                    <option value="admin">مدير النظام</option>
                    <option value="accountant">محاسب</option>
                    <option value="moderator">مشرف</option>
                    <option value="teacher">معلم</option>
                    <option value="student">طالب</option>
                    <option value="parent">ولي أمر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    القسم
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm text-gray-700">حساب نشط</label>
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                إدارة صلاحيات - {selectedUser.full_name}
              </h3>
              <button onClick={() => setShowRoleModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {/* Role Info */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    الدور الحالي: {getRoleName(selectedUser.role)}
                  </span>
                </div>
                <p className="text-sm text-blue-700">
                  {selectedUser.role === 'admin'
                    ? 'مدير النظام لديه كل الصلاحيات تلقائياً'
                    : 'يمكنك إضافة صلاحيات إضافية للمستخدم'}
                </p>
              </div>

              {/* Permissions by Module */}
              {Object.entries(
                allPermissions.reduce((acc, perm) => {
                  const module = perm.module;
                  if (!acc[module]) acc[module] = [];
                  acc[module].push(perm);
                  return acc;
                }, {} as Record<string, Permission[]>)
              ).map(([module, perms]) => (
                <div key={module} className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3 capitalize">
                    {module === 'users' ? 'المستخدمين' :
                     module === 'students' ? 'الطلاب' :
                     module === 'fees' ? 'الرسوم' :
                     module === 'expenses' ? 'المصروفات' :
                     module === 'teachers' ? 'المعلمين' :
                     module === 'reports' ? 'التقارير' :
                     module === 'system' ? 'النظام' : module}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {perms.map((perm) => (
                      <label
                        key={perm.id}
                        className={`flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
                          selectedUser.role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={userPermissions.has(perm.id)}
                          onChange={() => handleTogglePermission(perm.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          disabled={selectedUser.role === 'admin'}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{perm.name}</p>
                          <p className="text-xs text-gray-500">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
                >
                  تم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}