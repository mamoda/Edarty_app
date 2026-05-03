import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import type { AuthUser, UserSchoolRole, School, User } from "../types/database";

interface AuthContextType {
  authUser: AuthUser | null;
  profile: User | null;
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

// نوع المستخدم من Supabase Auth
interface SupabaseUser {
  id: string;
  email: string | null | undefined;
  user_metadata?: {
    full_name?: string;
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
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

  const loadCurrentSchoolData = useCallback(async (schoolId: string) => {
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
  }, []);

  const loadUserData = useCallback(async (user: SupabaseUser) => {
    if (loadingUserRef.current) return;
    loadingUserRef.current = true;

    try {
      if (!user) return;

      setAuthUser({ id: user.id, email: user.email ?? null });

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
      }
      
      if (!profileData) {
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        
        if (insertError) {
          console.error("Error creating user profile:", insertError);
        } else {
          const { data: newProfile } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          setProfile(newProfile || null);
        }
      } else {
        setProfile(profileData);
      }

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
        
        const { error: rpcError } = await supabase
          .rpc("create_school_for_user");
        
        if (rpcError) {
          console.error("RPC error:", rpcError);
        }
        
        const { data: newRoles } = await supabase
          .from("user_school_roles")
          .select("*")
          .eq("user_id", user.id);
        
        rolesData = newRoles || [];
        
        if (rolesData.length === 0) {
          console.log("Manual school creation fallback...");
        }
      }
      
      setUserRoles(rolesData);
      
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
  }, [loadCurrentSchoolData]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        setLoading(false);
        return;
      }

      await loadUserData(data.session.user as SupabaseUser);
    };
    init();
    
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_OUT") {
          setAuthUser(null);
          setProfile(null);
          setUserRoles([]);
          setCurrentSchool(null);
          setCurrentSchoolId(null);
          setCurrentRole(null);
          setLoading(false);
        } else if (event === "SIGNED_IN") {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.user) {
            await loadUserData(sessionData.session.user as SupabaseUser);
          }
        }
      }
    );
    
    return () => {
      listener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const switchSchool = useCallback(async (schoolId: string) => {
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
  }, [userRoles, authUser]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!currentRole) return false;
    if (currentRole === "admin") return true;

    const rolePermissions: Record<string, string[]> = {
      admin: ["manage_users", "view_financials", "manage_fees", "view_students", "edit_students"],
      accountant: ["view_financials", "manage_fees"],
      moderator: ["view_students", "edit_students", "manage_users"],
    };

    return rolePermissions[currentRole]?.includes(permission) || false;
  }, [currentRole]);

  const hasFeature = useCallback((feature: string): boolean => {
    return schoolFeatures.includes(feature);
  }, [schoolFeatures]);

  const refreshSchoolData = useCallback(async () => {
    if (currentSchoolId) {
      await loadCurrentSchoolData(currentSchoolId);
    }
  }, [currentSchoolId, loadCurrentSchoolData]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (data?.user && !error) {
      await loadUserData(data.user as SupabaseUser);
    }
    
    return { error };
  }, [loadUserData]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
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
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

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
    signIn,
    signUp,
    signOut,
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