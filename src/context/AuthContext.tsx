// src/context/AuthContext.tsx - إصلاح الأخطاء
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { CustomUser, UserSchoolRole, School } from '../types/database';

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  currentSchool: School | null;
  currentRole: string | null;
  userRoles: UserSchoolRole[];
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data?: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; data?: any }>;
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

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...');
        
        console.log('📡 Getting session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        }
        
        if (!session?.user) {
          console.log('ℹ️ No session found');
          if (isMounted) setLoading(false);
          return;
        }
        
        console.log('✅ User found:', session.user.email);
        console.log('🆔 User ID:', session.user.id);
        
        // جلب بيانات المستخدم من جدول users
        console.log('📊 Fetching user profile from users table...');
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Profile error:', profileError);
        }
        console.log('📋 Profile data:', profile);
        
        // جلب أدوار المستخدم
        console.log('👥 Fetching user roles from user_school_roles...');
        const { data: roles, error: rolesError } = await supabase
          .from('user_school_roles')
          .select('*, school:schools(*)')
          .eq('user_id', session.user.id);
        
        if (rolesError) {
          console.error('Roles error:', rolesError);
        }
        console.log('📊 Roles data:', roles?.length || 0, roles);
        
        if (!isMounted) return;
        
        // تعيين المستخدم
        const customUser: CustomUser = {
          ...session.user,
          school_id: profile?.school_id,
          full_name: profile?.full_name || session.user.user_metadata?.full_name,
          schoolName: profile?.school_name,
          schoolAddress: profile?.school_address,
          schoolPhone: profile?.school_phone,
          taxNumber: profile?.tax_number,
        };
        console.log('👤 Custom user set:', { email: customUser.email, school_id: customUser.school_id });
        setUser(customUser);
        
        // تعيين الأدوار
        setUserRoles(roles || []);
        
        // تحديد المدرسة الحالية
        const primaryRole = roles?.find(r => r.is_primary);
        let school: School | null = null;
        let role: string | null = null;
        
        if (primaryRole?.school) {
          school = primaryRole.school;
          role = primaryRole.role;
          console.log('🏫 Primary school found:', school?.name); // ✅ التحقق من null
        } else if (roles?.[0]?.school) {
          school = roles[0].school;
          role = roles[0].role;
          console.log('🏫 First school found:', school?.name); // ✅ التحقق من null
        } else {
          console.log('⚠️ No school found in roles!');
        }
        
        setCurrentSchool(school);
        setCurrentRole(role);
        
        console.log('✅ User data loaded:', { 
          school: school?.name || 'No school', // ✅ التحقق من null
          role, 
          rolesCount: roles?.length || 0 
        });
        
        if (isMounted) {
          setLoading(false);
          console.log('✅ Loading complete');
        }
        
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (isMounted) setLoading(false);
      }
    };

    timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ Auth loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 8000);

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        
        console.log('🔄 Auth state changed:', _event);
        
        if (session?.user) {
          console.log('📥 Loading data after auth change...');
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          const { data: roles } = await supabase
            .from('user_school_roles')
            .select('*, school:schools(*)')
            .eq('user_id', session.user.id);
          
          const customUser: CustomUser = {
            ...session.user,
            school_id: profile?.school_id,
            full_name: profile?.full_name,
          };
          setUser(customUser);
          setUserRoles(roles || []);
          
          const primaryRole = roles?.find(r => r.is_primary);
          if (primaryRole?.school) {
            setCurrentSchool(primaryRole.school);
            setCurrentRole(primaryRole.role);
          } else if (roles?.[0]?.school) {
            setCurrentSchool(roles[0].school);
            setCurrentRole(roles[0].role);
          }
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
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null; data?: any }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        return { error: new Error(error.message), data: null };
      }
      return { error: null, data };
    } catch (err) {
      setLoading(false);
      return { error: err instanceof Error ? err : new Error('Unknown error'), data: null };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string): Promise<{ error: Error | null; data?: any }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: fullName } }
      });
      
      if (!error && data.user) {
        await supabase
          .from('users')
          .upsert([{ 
            id: data.user.id, 
            email, 
            full_name: fullName,
            school_id: null,
            created_at: new Date().toISOString()
          }], { onConflict: 'id' });
      }
      
      setLoading(false);
      if (error) {
        return { error: new Error(error.message), data: null };
      }
      return { error: null, data };
    } catch (err) {
      setLoading(false);
      return { error: err instanceof Error ? err : new Error('Unknown error'), data: null };
    }
  };

  const signOut = async () => {
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
      accountant: ['view_financials', 'manage_fees', 'manage_expenses', 'view_reports', 'add_fees', 'edit_fees', 'delete_fees', 'add_expenses', 'edit_expenses', 'delete_expenses'],
      moderator: ['view_students', 'view_teachers', 'edit_students', 'edit_teachers', 'add_students', 'delete_students'],
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