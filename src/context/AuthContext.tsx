// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { CustomUser, UserSchoolRole, School } from '../types/database';

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  currentSchool: School | null;
  currentRole: string | null;
  userRoles: UserSchoolRole[];
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchSchool: (schoolId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserSchoolRole[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  // جلب بيانات المستخدم الكاملة من جدول users
  const fetchUserProfile = async (supabaseUser: any): Promise<CustomUser> => {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      }

      console.log('📋 User profile:', profile);
      console.log('🏫 User school_id:', profile?.school_id);

      return {
        ...supabaseUser,
        school_id: profile?.school_id,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
        schoolName: profile?.school_name,
        schoolAddress: profile?.school_address,
        schoolPhone: profile?.school_phone,
        taxNumber: profile?.tax_number,
      } as CustomUser;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return supabaseUser as CustomUser;
    }
  };

  // جلب أدوار المستخدم في المدارس
  const fetchUserRoles = async (userId: string, userSchoolId?: string): Promise<UserSchoolRole[]> => {
    try {
      let roles: UserSchoolRole[] = [];
      
      // 1. جلب الأدوار من جدول user_school_roles (للمستخدمين الذين يديرون مدارس متعددة)
      const { data: roleData, error: roleError } = await supabase
        .from('user_school_roles')
        .select('*, school:schools(*)')
        .eq('user_id', userId);
      
      if (roleError) {
        console.error('Error fetching user roles:', roleError);
      } else if (roleData && roleData.length > 0) {
        roles = roleData;
        console.log('✅ Found roles from user_school_roles:', roles.length);
      }
      
      // 2. إذا كان المستخدم لديه school_id في جدول users ولم يوجد في الأدوار
      if (userSchoolId && roles.length === 0) {
        console.log('📌 User has school_id but no roles, fetching school...');
        
        // جلب بيانات المدرسة
        const { data: school, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', userSchoolId)
          .single();
        
        if (schoolError) {
          console.error('Error fetching school:', schoolError);
        } else if (school) {
          // إنشاء دور افتراضي للمستخدم
          const defaultRole: UserSchoolRole = {
            id: crypto.randomUUID(),
            user_id: userId,
            school_id: userSchoolId,
            role: 'admin',
            permissions: [],
            is_primary: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            school: school
          };
          
          roles = [defaultRole];
          
          // حفظ الدور في قاعدة البيانات (اختياري)
          await supabase
            .from('user_school_roles')
            .upsert([{
              user_id: userId,
              school_id: userSchoolId,
              role: 'admin',
              is_primary: true
            }], { onConflict: 'user_id, school_id' });
          
          console.log('✅ Created default role for user');
        }
      }
      
      return roles;
    } catch (error) {
      console.error('Error in fetchUserRoles:', error);
      return [];
    }
  };

  // تحديد المدرسة الحالية من الأدوار
  const getCurrentSchoolFromRoles = (roles: UserSchoolRole[]) => {
    // 1. نجيب المدرسة الأساسية (is_primary = true)
    const primaryRole = roles.find(r => r.is_primary);
    if (primaryRole && primaryRole.school) {
      return { school: primaryRole.school, role: primaryRole.role };
    }
    
    // 2. أول مدرسة في القائمة
    if (roles[0] && roles[0].school) {
      return { school: roles[0].school, role: roles[0].role };
    }
    
    return { school: null, role: null };
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        
        // جلب الجلسة الحالية
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          console.log('✅ User found:', session.user.email);
          
          // جلب بيانات المستخدم
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
          
          // جلب أدوار المستخدم - نمرر school_id من المستخدم
          const roles = await fetchUserRoles(session.user.id, enhancedUser.school_id);
          setUserRoles(roles);
          
          // تحديد المدرسة الحالية
          const { school, role } = getCurrentSchoolFromRoles(roles);
          setCurrentSchool(school);
          setCurrentRole(role);
          
          console.log('🏫 Current school:', school?.name || 'No school');
          console.log('👤 Current role:', role || 'No role');
          console.log('📊 Total roles found:', roles.length);
        } else {
          console.log('ℹ️ No user session found');
        }
        
        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // الاستماع لتغييرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        
        console.log('🔄 Auth state changed:', _event);
        
        if (session?.user) {
          console.log('✅ User logged in:', session.user.email);
          
          const enhancedUser = await fetchUserProfile(session.user);
          setUser(enhancedUser);
          
          const roles = await fetchUserRoles(session.user.id, enhancedUser.school_id);
          setUserRoles(roles);
          
          const { school, role } = getCurrentSchoolFromRoles(roles);
          setCurrentSchool(school);
          setCurrentRole(role);
        } else {
          console.log('👋 User logged out');
          setUser(null);
          setUserRoles([]);
          setCurrentSchool(null);
          setCurrentRole(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Signing in...');
    setLoading(true);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) {
      console.log('✅ Sign in successful');
      const enhancedUser = await fetchUserProfile(data.user);
      setUser(enhancedUser);
      
      const roles = await fetchUserRoles(data.user.id, enhancedUser.school_id);
      setUserRoles(roles);
      
      const { school, role } = getCurrentSchoolFromRoles(roles);
      setCurrentSchool(school);
      setCurrentRole(role);
    } else if (error) {
      console.error('❌ Sign in error:', error);
    }
    
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    console.log('📝 Signing up...');
    setLoading(true);
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { full_name: fullName } }
    });
    
    if (!error && data.user) {
      console.log('✅ Sign up successful');
      
      // إنشاء حساب في جدول users
      await supabase
        .from('users')
        .upsert([{ 
          id: data.user.id, 
          email, 
          full_name: fullName,
          created_at: new Date().toISOString()
        }], { onConflict: 'id' });
      
      const enhancedUser = await fetchUserProfile(data.user);
      setUser(enhancedUser);
    } else if (error) {
      console.error('❌ Sign up error:', error);
    }
    
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    console.log('🚪 Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setUserRoles([]);
    setCurrentSchool(null);
    setCurrentRole(null);
  };

  const switchSchool = async (schoolId: string) => {
    const role = userRoles.find(r => r.school_id === schoolId);
    if (role && role.school && user) {
      setCurrentSchool(role.school);
      setCurrentRole(role.role);
      localStorage.setItem(`current_school_${user.id}`, schoolId);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (currentRole === 'admin') return true;
    
    const rolePermissions: Record<string, string[]> = {
      accountant: ['view_financials', 'manage_fees', 'manage_expenses', 'view_reports'],
      moderator: ['view_students', 'view_teachers', 'edit_students', 'edit_teachers'],
    };
    
    const permissions = rolePermissions[currentRole || ''] || [];
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      currentSchool,
      currentRole,
      userRoles,
      signIn, 
      signUp, 
      signOut,
      switchSchool,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}