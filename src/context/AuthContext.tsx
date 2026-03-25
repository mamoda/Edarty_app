// src/context/AuthContext.tsx - نسخة مع logs مفصلة جداً
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
  refreshSchoolData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserSchoolRole[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [schoolFeatures, setSchoolFeatures] = useState<string[]>([]);

  const isLoadingRef = useRef(false);
  const initializedRef = useRef(false);

  const isAuthenticated = useMemo(() => !!authUser, [authUser]);

  // ============================================
  // Load School Data
  // ============================================

  const loadCurrentSchoolData = useCallback(async (schoolId: string) => {
    console.log("🏫 [loadCurrentSchoolData] Starting for:", schoolId);
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();

    if (!error && data) {
      setCurrentSchool(data);
      setSubscriptionPlan(data.subscription_plan);
      setSubscriptionExpiresAt(data.subscription_expires_at);
      setSchoolFeatures(data.features || []);
      console.log("✅ [loadCurrentSchoolData] School loaded:", data.name);
    } else {
      console.error("❌ [loadCurrentSchoolData] Error:", error);
    }
  }, []);

  // ============================================
  // Load User Data - مع logs مفصلة جداً
  // ============================================

  const loadUserData = useCallback(async (user: any) => {
    console.log("🚀 [loadUserData] STARTED with user:", user?.email);
    
    if (!user) {
      console.log("❌ [loadUserData] No user to load");
      setLoading(false);
      return;
    }
    
    if (isLoadingRef.current) {
      console.log("⏳ [loadUserData] Already loading, skipping...");
      return;
    }

    isLoadingRef.current = true;
    console.log("📥 [loadUserData] Loading for:", user.email);

    try {
      // 1. auth user
      console.log("📌 [loadUserData] Step 1: Setting authUser");
      const authUserData: AuthUser = {
        id: user.id,
        email: user.email,
      };
      setAuthUser(authUserData);
      console.log("✅ [loadUserData] authUser set");

      // 2. profile (public.users)
      console.log("📌 [loadUserData] Step 2: Fetching profile from users table...");
      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("❌ [loadUserData] Profile error:", profileError);
      } else {
        console.log("✅ [loadUserData] Profile data:", profileData);
      }
      
      setProfile(profileData || null);
      console.log("✅ [loadUserData] Profile set");

      // 3. roles + schools
      console.log("📌 [loadUserData] Step 3: Fetching roles...");
      const { data: roles, error: rolesError } = await supabase
        .from("user_school_roles")
        .select("*, school:schools(*)")
        .eq("user_id", user.id);

      if (rolesError) {
        console.error("❌ [loadUserData] Roles error:", rolesError);
      }
      
      const rolesData = roles || [];
      setUserRoles(rolesData);
      console.log("✅ [loadUserData] Roles loaded:", rolesData.length, "roles");

      // 4. select school
      console.log("📌 [loadUserData] Step 4: Selecting school...");
      if (rolesData.length > 0) {
        const savedSchoolId = localStorage.getItem(`current_school_${user.id}`);
        console.log("📌 [loadUserData] Saved school ID:", savedSchoolId);

        const selectedRole =
          rolesData.find((r: any) => r.school_id === savedSchoolId) ||
          rolesData.find((r: any) => r.is_primary) ||
          rolesData[0];

        console.log("📌 [loadUserData] Selected role:", selectedRole?.role, "school:", selectedRole?.school?.name);

        if (selectedRole?.school) {
          setCurrentSchool(selectedRole.school);
          setCurrentRole(selectedRole.role);
          setSubscriptionPlan(selectedRole.school.subscription_plan);
          setSubscriptionExpiresAt(selectedRole.school.subscription_expires_at);
          setSchoolFeatures(selectedRole.school.features || []);
          console.log("✅ [loadUserData] School set:", selectedRole.school.name);
        } else {
          console.log("⚠️ [loadUserData] Selected role has no school data");
        }
      } else {
        console.log("⚠️ [loadUserData] No roles found for user");
        setCurrentSchool(null);
        setCurrentRole(null);
      }

      console.log("✅ [loadUserData] COMPLETED SUCCESSFULLY");
    } catch (error) {
      console.error("❌ [loadUserData] CATCH ERROR:", error);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
      console.log("🟢 [loadUserData] Loading state set to false");
    }
  }, []);

  // ============================================
  // Auth Init
  // ============================================

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;

    const init = async () => {
      try {
        console.log("🔐 [Auth Init] Starting...");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("❌ [Auth Init] Session error:", error);
        }
        
        console.log("📌 [Auth Init] Session user:", data.session?.user?.email || "none");

        if (data.session?.user && mounted) {
          console.log("📌 [Auth Init] Calling loadUserData...");
          await loadUserData(data.session.user);
        } else if (mounted) {
          console.log("📌 [Auth Init] No active session, setting loading to false");
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ [Auth Init] Error:", error);
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log("🔄 [Auth Init] Auth event:", event);

        if (event === "SIGNED_IN" && session?.user) {
          console.log("📌 [Auth Init] SIGNED_IN, calling loadUserData...");
          setLoading(true);
          await loadUserData(session.user);
        }

        if (event === "SIGNED_OUT") {
          console.log("📌 [Auth Init] SIGNED_OUT, resetting state");
          setAuthUser(null);
          setProfile(null);
          setUserRoles([]);
          setCurrentSchool(null);
          setCurrentRole(null);
          setSubscriptionPlan(null);
          setSubscriptionExpiresAt(null);
          setSchoolFeatures([]);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
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
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const switchSchool = async (schoolId: string) => {
    const role = userRoles.find((r) => r.school_id === schoolId);

    if (role?.school && authUser) {
      setCurrentSchool(role.school);
      setCurrentRole(role.role);
      setSubscriptionPlan(role.school.subscription_plan);
      setSubscriptionExpiresAt(role.school.subscription_expires_at);
      setSchoolFeatures(role.school.features || []);
      localStorage.setItem(`current_school_${authUser.id}`, schoolId);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentRole) return false;
    if (["admin"].includes(currentRole)) return true;
    const rolePermissions: Record<string, string[]> = {
      accountant: ["view_financials", "manage_fees", "manage_expenses"],
      moderator: ["view_students", "edit_students"],
    };
    return rolePermissions[currentRole]?.includes(permission) || false;
  };

  const hasFeature = (feature: string): boolean => {
    return schoolFeatures.includes(feature);
  };

  const refreshSchoolData = async () => {
    if (currentSchool?.id) {
      await loadCurrentSchoolData(currentSchool.id);
    }
  };

  const value = {
    authUser,
    profile,
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
    refreshSchoolData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}