// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import { 
  CustomUser, 
  UserSchoolRole, 
  School, 
  UserProfileRow,
  UserSchoolRoleWithSchool 
} from "../types/database";

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  currentSchool: School | null;
  currentRole: string | null;
  userRoles: UserSchoolRole[];
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  schoolFeatures: string[];
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchSchool: (schoolId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasFeature: (feature: string) => boolean;
  getLimits: () => {
    maxStudents: number;
    maxTeachers: number;
    maxUsers: number;
  };
  canAccessResource: (resource: string, currentCount: number) => boolean;
  refreshSchoolData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserSchoolRole[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [schoolFeatures, setSchoolFeatures] = useState<string[]>([]);
  
  const isLoadingRef = useRef(false);
  const initializedRef = useRef(false);
  const authListenerRef = useRef<any>(null);

  const isAuthenticated = useMemo(() => !!user, [user]);

  // ✅ تحميل بيانات المدرسة الحالية
  const loadCurrentSchoolData = useCallback(async (schoolId: string) => {
    if (!schoolId) return;

    try {
      console.log("🏫 Loading school data for:", schoolId);
      const { data: school, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .single();

      if (error) {
        console.error("Error loading school:", error);
        return;
      }

      if (school) {
        const schoolData = school as School;
        setCurrentSchool(schoolData);
        setSubscriptionPlan(schoolData.subscription_plan);
        setSubscriptionExpiresAt(schoolData.subscription_expires_at);
        setSchoolFeatures(schoolData.features || []);
        console.log("✅ School data loaded:", schoolData.name);
      }
    } catch (error) {
      console.error("Error loading school data:", error);
    }
  }, []);

  // ✅ تحميل بيانات المستخدم - النسخة المستقرة مع logs للتتبع
  const loadUserData = useCallback(async (supabaseUser: any) => {
    if (!supabaseUser) {
      console.log("No user to load");
      setLoading(false);
      return;
    }
    
    if (isLoadingRef.current) {
      console.log("Already loading user data, skipping...");
      return;
    }

    isLoadingRef.current = true;
    console.log("📥 Loading user data for:", supabaseUser.email);

    try {
      // 1. تحميل الملف الشخصي
      console.log("🔍 Step 1: Fetching profile...");
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
      }
      console.log("✅ Profile fetched:", profile ? profile.full_name : "not found");

      // 2. تحميل الأدوار مع المدارس
      console.log("🔍 Step 2: Fetching roles...");
      const { data: roles, error: rolesError } = await supabase
        .from("user_school_roles")
        .select("*, school:schools(*)")
        .eq("user_id", supabaseUser.id);

      if (rolesError) {
        console.error("Roles error:", rolesError);
      }
      console.log("✅ Roles fetched:", roles?.length || 0, "roles found");

      // 3. بناء المستخدم المخصص
      const customUser: CustomUser = {
        ...supabaseUser,
        school_id: profile?.school_id,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
        schoolName: profile?.school_name || undefined,
        schoolAddress: profile?.school_address || undefined,
        schoolPhone: profile?.school_phone || undefined,
        taxNumber: profile?.tax_number || undefined,
      };

      setUser(customUser);
      console.log("✅ User set");

      // 4. معالجة الأدوار
      const rolesData = roles || [];
      setUserRoles(rolesData);
      console.log("✅ User roles set:", rolesData.length);

      if (rolesData.length > 0) {
        const savedSchoolId = localStorage.getItem(`current_school_${supabaseUser.id}`);
        console.log("Saved school ID:", savedSchoolId);
        
        const selectedRole = savedSchoolId 
          ? rolesData.find((r: any) => r.school_id === savedSchoolId) 
          : rolesData.find((r: any) => r.is_primary) || rolesData[0];

        console.log("Selected role:", selectedRole?.role, "school:", selectedRole?.school?.name);

        if (selectedRole?.school) {
          const schoolData = selectedRole.school;
          setCurrentSchool(schoolData);
          setCurrentRole(selectedRole.role);
          setSubscriptionPlan(schoolData.subscription_plan);
          setSubscriptionExpiresAt(schoolData.subscription_expires_at);
          setSchoolFeatures(schoolData.features || []);
          console.log("✅ School set:", schoolData.name);
        } else {
          console.log("Selected role has no school data");
        }
      } else {
        console.log("No roles found for user");
      }

      console.log("✅ User data loaded successfully");
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
      console.log("Loading state set to false");
    }
  }, []);

  const refreshSchoolData = useCallback(async () => {
    if (currentSchool?.id) {
      await loadCurrentSchoolData(currentSchool.id);
    }
  }, [currentSchool?.id, loadCurrentSchoolData]);

  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (currentRole === "super_admin") return true;
      return schoolFeatures.includes(feature);
    },
    [currentRole, schoolFeatures]
  );

  const getLimits = useCallback(() => {
    const limits: Record<string, { maxStudents: number; maxTeachers: number; maxUsers: number }> = {
      free: { maxStudents: 50, maxTeachers: 10, maxUsers: 5 },
      basic: { maxStudents: 200, maxTeachers: 30, maxUsers: 15 },
      pro: { maxStudents: 1000, maxTeachers: 100, maxUsers: 50 },
      enterprise: { maxStudents: Infinity, maxTeachers: Infinity, maxUsers: Infinity },
    };
    const plan = subscriptionPlan || "free";
    return limits[plan] || limits.free;
  }, [subscriptionPlan]);

  const canAccessResource = useCallback(
    (resource: string, currentCount: number): boolean => {
      const limits = getLimits();
      switch (resource) {
        case "students": return currentCount < limits.maxStudents;
        case "teachers": return currentCount < limits.maxTeachers;
        case "users": return currentCount < limits.maxUsers;
        default: return true;
      }
    },
    [getLimits]
  );

  // ✅ تهيئة المصادقة
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log("🔐 Initializing auth...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
        }

        console.log("Session user:", session?.user?.email || "none");

        if (session?.user && isMounted) {
          await loadUserData(session.user);
        } else if (isMounted) {
          console.log("No active session, setting loading to false");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth event:", event);
      if (!isMounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        setLoading(true);
        await loadUserData(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setUserRoles([]);
        setCurrentSchool(null);
        setCurrentRole(null);
        setSubscriptionPlan(null);
        setSubscriptionExpiresAt(null);
        setSchoolFeatures([]);
        setLoading(false);
      }
    });
    
    authListenerRef.current = subscription;

    return () => {
      isMounted = false;
      authListenerRef.current?.unsubscribe();
    };
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error: any) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (!error && data.user) {
        await supabase.from("users").insert({
          id: data.user.id,
          email,
          full_name: fullName,
          created_at: new Date().toISOString(),
        });
      }
      return { error };
    } catch (error: any) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const switchSchool = async (schoolId: string) => {
    const role = userRoles.find((r) => r.school_id === schoolId);
    if (role?.school && user) {
      setCurrentSchool(role.school);
      setCurrentRole(role.role);
      setSubscriptionPlan(role.school.subscription_plan);
      setSubscriptionExpiresAt(role.school.subscription_expires_at);
      setSchoolFeatures(role.school.features || []);
      localStorage.setItem(`current_school_${user.id}`, schoolId);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentRole) return false;
    if (currentRole === "super_admin" || currentRole === "admin") return true;

    const rolePermissions: Record<string, string[]> = {
      accountant: ["view_financials", "manage_fees", "manage_expenses", "view_reports"],
      moderator: ["view_students", "view_teachers", "edit_students", "edit_teachers"],
    };
    return rolePermissions[currentRole]?.includes(permission) || false;
  };

  const value = useMemo(() => ({
    user,
    loading,
    currentSchool,
    currentRole,
    userRoles,
    subscriptionPlan,
    subscriptionExpiresAt,
    schoolFeatures,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    switchSchool,
    hasPermission,
    hasFeature,
    getLimits,
    canAccessResource,
    refreshSchoolData,
  }), [user, loading, currentSchool, currentRole, userRoles, subscriptionPlan, subscriptionExpiresAt, schoolFeatures, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}