// src/components/UserManagement.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  X, 
  Search, 
  Shield, 
  Mail,
  Lock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Crown,
  Briefcase,
  GraduationCap,
  User
} from 'lucide-react';

interface UserManagementProps {
  onUpdate: () => void;
}

interface SchoolUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  school_id: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

const roleLabels = {
  admin: { label: 'مدير', color: 'bg-purple-100 text-purple-700', icon: Crown },
  accountant: { label: 'محاسب', color: 'bg-blue-100 text-blue-700', icon: Briefcase },
  moderator: { label: 'مشرف', color: 'bg-green-100 text-green-700', icon: GraduationCap },
  teacher: { label: 'معلم', color: 'bg-orange-100 text-orange-700', icon: User },
  parent: { label: 'ولي أمر', color: 'bg-gray-100 text-gray-700', icon: Users },
};

const roleOptions = [
  { value: 'admin', label: 'مدير - صلاحيات كاملة' },
  { value: 'accountant', label: 'محاسب - إدارة الرسوم والمصروفات' },
  { value: 'moderator', label: 'مشرف - إدارة الطلاب والمعلمين' },
  { value: 'teacher', label: 'معلم - عرض الطلاب فقط' },
  { value: 'parent', label: 'ولي أمر - متابعة الطالب' },
];

export default function UserManagement({ onUpdate }: UserManagementProps) {
  const { currentSchool, user: currentUser } = useAuth();
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'moderator' as 'admin' | 'accountant' | 'moderator' | 'teacher' | 'parent',
  });

  useEffect(() => {
    loadUsers();
  }, [currentSchool]);

  const loadUsers = async () => {
    if (!currentSchool) return;
    
    setLoading(true);
    try {
      // استعلام مبسط: جلب الأدوار أولاً
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_school_roles')
        .select('*')
        .eq('school_id', currentSchool.id);
      
      if (rolesError) throw rolesError;
      
      if (!rolesData || rolesData.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      
      // جلب بيانات المستخدمين بشكل منفصل
      const userIds = rolesData.map(r => r.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, created_at, last_login, is_active')
        .in('id', userIds);
      
      if (usersError) throw usersError;
      
      // دمج البيانات
      const usersMap = new Map();
      usersData?.forEach(user => {
        usersMap.set(user.id, user);
      });
      
      const usersList: SchoolUser[] = rolesData.map(role => {
        const user = usersMap.get(role.user_id);
        return {
          id: role.user_id,
          email: user?.email || '',
          full_name: user?.full_name || '',
          role: role.role,
          school_id: role.school_id,
          created_at: role.created_at,
          last_login: user?.last_login || null,
          is_active: user?.is_active ?? true,
        };
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      setFormError('حدث خطأ في تحميل المستخدمين');
      setTimeout(() => setFormError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!currentSchool) {
      setFormError('لم يتم تحديد المدرسة');
      return;
    }
    
    if (!formData.email || !formData.password || !formData.full_name) {
      setFormError('يرجى إكمال جميع البيانات المطلوبة');
      return;
    }
    
    if (formData.password.length < 6) {
      setFormError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    
    try {
      // 1. إنشاء حساب في Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { 
            full_name: formData.full_name,
            school_id: currentSchool.id
          }
        }
      });
      
      if (authError) {
        if (authError.message.includes('already registered')) {
          setFormError('البريد الإلكتروني مستخدم بالفعل');
        } else {
          setFormError(authError.message);
        }
        return;
      }
      
      if (!authData.user) {
        setFormError('فشل في إنشاء المستخدم');
        return;
      }
      
      // 2. إضافة المستخدم إلى جدول users
      await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.full_name,
          school_id: currentSchool.id,
          is_active: true,
          created_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      
      // 3. إضافة دور المستخدم في المدرسة
      const { error: roleError } = await supabase
        .from('user_school_roles')
        .insert({
          user_id: authData.user.id,
          school_id: currentSchool.id,
          role: formData.role,
          is_primary: true,
          permissions: []
        });
      
      if (roleError) {
        console.error('Error creating user role:', roleError);
      }
      
      setFormSuccess(`تم إضافة المستخدم ${formData.full_name} بنجاح`);
      resetForm();
      loadUsers();
      onUpdate();
      
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error adding user:', error);
      setFormError(error.message || 'حدث خطأ أثناء إضافة المستخدم');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!currentSchool) return;
    
    try {
      const { error } = await supabase
        .from('user_school_roles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('school_id', currentSchool.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      setFormSuccess(`تم تحديث دور المستخدم بنجاح`);
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating role:', error);
      setFormError('حدث خطأ أثناء تحديث الدور');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  const handleDeleteUser = async (user: SchoolUser) => {
    if (user.id === currentUser?.id) {
      setFormError('لا يمكن حذف حسابك الحالي');
      setTimeout(() => setFormError(''), 3000);
      return;
    }
    
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${user.full_name}"؟`)) return;
    
    try {
      // حذف دور المستخدم
      await supabase
        .from('user_school_roles')
        .delete()
        .eq('user_id', user.id)
        .eq('school_id', currentSchool?.id);
      
      // تحديث حالة المستخدم
      await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', user.id);
      
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setFormSuccess(`تم حذف المستخدم ${user.full_name} بنجاح`);
      setTimeout(() => setFormSuccess(''), 3000);
      onUpdate();
    } catch (error) {
      console.error('Error deleting user:', error);
      setFormError('حدث خطأ أثناء حذف المستخدم');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'moderator',
    });
    setShowForm(false);
    setFormError('');
    setFormSuccess('');
    setShowPassword(false);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleInfo = (role: string) => {
    return roleLabels[role as keyof typeof roleLabels] || roleLabels.moderator;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h2>
          <p className="text-sm text-gray-600 mt-1">
            إضافة وتعديل أدوار المستخدمين في المدرسة
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
        >
          <UserPlus className="w-5 h-5" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {formSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">{formSuccess}</p>
        </div>
      )}
      
      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{formError}</p>
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
            placeholder="البحث عن مستخدم (بالاسم أو البريد الإلكتروني)..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? 'لا توجد نتائج للبحث' : 'لم يتم إضافة أي مستخدمين بعد'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-all"
          >
            إضافة أول مستخدم
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => {
            const roleInfo = getRoleInfo(user.role);
            const RoleIcon = roleInfo.icon;
            
            return (
              <div
                key={user.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center">
                        <span className="text-purple-700 font-bold text-lg">
                          {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {user.full_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{user.email}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div>
                        <span className="text-sm text-gray-500">الدور</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
                            <RoleIcon className="w-3 h-3" />
                            {roleInfo.label}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm text-gray-500">تاريخ الإضافة</span>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {new Date(user.created_at).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    >
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    
                    {user.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="حذف المستخدم"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">إضافة مستخدم جديد</h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="أحمد محمد"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="user@school.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pr-10 pl-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الدور <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Shield className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none"
                    required
                  >
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">ملخص الصلاحيات حسب الدور:</h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• <span className="font-semibold">مدير:</span> صلاحيات كاملة (إدارة جميع البيانات والمستخدمين)</li>
                  <li>• <span className="font-semibold">محاسب:</span> إدارة الرسوم الدراسية والمصروفات والتقارير المالية</li>
                  <li>• <span className="font-semibold">مشرف:</span> إدارة الطلاب والمعلمين (إضافة/تعديل/حذف)</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-all"
                >
                  إضافة المستخدم
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}