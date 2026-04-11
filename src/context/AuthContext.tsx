// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import {
  AuthUser,
  UserProfile,
  UserSchoolRole,
  School,
} from "../types/database";

interface AuthContextType {
  authUser: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  currentSchool: School | null;
  currentSchoolId: string | null;
  currentRole: string | null;
  userRoles: UserSchoolRole[];
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  schoolFeatures: string[];
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchSchool: (schoolId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasFeature: (feature: string) => boolean;
  refreshSchoolData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserSchoolRole[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [schoolFeatures, setSchoolFeatures] = useState<string[]>([]);
  const loadingUserRef = useRef(false);
  const initializedRef = useRef(false);
  const isAuthenticated = useMemo(() => !!authUser, [authUser]);


  const loadCurrentSchoolData = async (schoolId: string) => {
    const { data } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();

    if (data) {
      setCurrentSchool(data);
      setSubscriptionPlan(data.subscription_plan);
      setSubscriptionExpiresAt(data.subscription_expires_at);
      setSchoolFeatures(data.features || []);
    }
  };

// src/context/AuthContext.tsx - نسخة محسنة لجدول users المخصص

const loadUserData = async (user: any) => {
  if (loadingUserRef.current) return;
  loadingUserRef.current = true;

  try {
    if (!user) return;

    setAuthUser({ id: user.id, email: user.email });

    // ✅ جلب من جدول users المخصص (ليس auth.users)
    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile error:", profileError);
    }
    
    // إذا لم يكن هناك بروفايل، أنشئ واحداً
    if (!profileData) {
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          is_active: true,
        });
      
      if (insertError) {
        console.error("Error creating user profile:", insertError);
      }
    }
    
    setProfile(profileData || null);

    // ✅ جلب الأدوار
    const { data: roles, error: rolesError } = await supabase
      .from("user_school_roles")
      .select("*")
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("Roles fetch error:", rolesError);
      setLoading(false);
      return;
    }

    let rolesData = roles || [];
    
    if (rolesData.length === 0) {
      console.log("🚀 Creating school via RPC...");
      
      const { error: rpcError } = await supabase.rpc("create_school_for_user");
      
      if (rpcError) {
        console.error("RPC error:", rpcError);
        setLoading(false);
        return;
      }
      
      const { data: newRoles } = await supabase
        .from("user_school_roles")
        .select("*")
        .eq("user_id", user.id);
      
      rolesData = newRoles || [];
    }
    
    setUserRoles(rolesData);
    
    // ✅ جلب بيانات المدارس
    if (rolesData.length > 0) {
      const schoolIds = [...new Set(rolesData.map(r => r.school_id).filter(Boolean))];
      
      if (schoolIds.length > 0) {
        const { data: schoolsData } = await supabase
          .from("schools")
          .select("*")
          .in("id", schoolIds);
        
        const schoolsMap = new Map(schoolsData?.map(s => [s.id, s]) || []);
        
        const rolesWithSchools = rolesData.map(role => ({
          ...role,
          schools: schoolsMap.get(role.school_id) || null
        }));
        
        setUserRoles(rolesWithSchools);
        
        const savedSchoolId = localStorage.getItem(`current_school_${user.id}`);
        const selectedRole = rolesWithSchools.find(r => r.school_id === savedSchoolId) ||
          rolesWithSchools.find(r => r.is_primary) ||
          rolesWithSchools[0];
        
        if (selectedRole?.school_id) {
          setCurrentSchoolId(selectedRole.school_id);
          setCurrentRole(selectedRole.role);
          localStorage.setItem(`current_school_${user.id}`, selectedRole.school_id);
          
          if (selectedRole.schools) {
            setCurrentSchool(selectedRole.schools);
            setSubscriptionPlan(selectedRole.schools.subscription_plan);
            setSubscriptionExpiresAt(selectedRole.schools.subscription_expires_at);
            setSchoolFeatures(selectedRole.schools.features || []);
          } else {
            await loadCurrentSchoolData(selectedRole.school_id);
          }
        }
      }
    }
    
  } catch (error) {
    console.error("loadUserData error:", error);
  } finally {
    loadingUserRef.current = false;
    setLoading(false);
  }
};  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        setLoading(false);
        return;
      }

      await loadUserData(data.session.user);
    };
    init();
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setAuthUser(null);
          setProfile(null);
          setUserRoles([]);
          setCurrentSchool(null);
          setCurrentSchoolId(null);
          setCurrentRole(null);
          setLoading(false);
        }
      }
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);



  const switchSchool = async (schoolId: string) => {
    const role = userRoles.find((r) => r.school_id === schoolId);

    if (role?.school && authUser) {
      setCurrentSchool(role.school);
      setCurrentSchoolId(schoolId);
      setCurrentRole(role.role);

      setSubscriptionPlan(role.school.subscription_plan);
      setSubscriptionExpiresAt(role.school.subscription_expires_at);
      setSchoolFeatures(role.school.features || []);

      localStorage.setItem(`current_school_${authUser.id}`, schoolId);
    }
  };



// تعديل دالة hasPermission في AuthContext.tsx
const hasPermission = (permission: string): boolean => {
  if (!currentRole) return false;
  if (currentRole === "admin") return true;

  const rolePermissions: Record<string, string[]> = {
    admin: ["manage_users", "view_financials", "manage_fees", "view_students", "edit_students"],
    accountant: ["view_financials", "manage_fees"],
    moderator: ["view_students", "edit_students", "manage_users"], // أضفنا manage_users هنا
  };

  return rolePermissions[currentRole]?.includes(permission) || false;
};
  const hasFeature = (feature: string): boolean => {
    return schoolFeatures.includes(feature);
  };

  const refreshSchoolData = async () => {
    if (currentSchoolId) {
      await loadCurrentSchoolData(currentSchoolId);
    }
  };

  // ============================================
  // Auth Actions
  // ============================================
  const value = {
    authUser,
    profile,
    loading,
    currentSchool,
    currentSchoolId,
    currentRole,
    userRoles,
    subscriptionPlan,
    subscriptionExpiresAt,
    schoolFeatures,
    isAuthenticated,

    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },

    signUp: async (email: string, password: string, fullName?: string) => {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (!error && data.user) {
        await supabase.from("users").insert({
          id: data.user.id,
          email,
          full_name: fullName,
        });
      }

      setLoading(false);
      return { error };
    },

    signOut: async () => {
      await supabase.auth.signOut();
    },

    switchSchool,
    hasPermission,
    hasFeature,
    refreshSchoolData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}