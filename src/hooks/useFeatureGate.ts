// src/hooks/useFeatureGate.ts
import { useAuth } from "../context/AuthContext";

interface FeatureGate {
  hasFeature: (feature: string) => boolean;
  canAddStudent: (currentCount: number) => boolean;
  canAddTeacher: (currentCount: number) => boolean;
  canAddUser: (currentCount: number) => boolean;
  showUpgradePrompt: (feature: string) => boolean;
  limits: {
    maxStudents: number;
    maxTeachers: number;
    maxUsers: number;
  };
}

export const useFeatureGate = (): FeatureGate => {
  const { hasFeature, getLimits, canAccessResource, subscriptionPlan } = useAuth();
  const limits = getLimits();

  const showUpgradePrompt = (feature: string): boolean => {
    return !hasFeature(feature);
  };

  return {
    hasFeature,
    canAddStudent: (currentCount: number) => canAccessResource("students", currentCount),
    canAddTeacher: (currentCount: number) => canAccessResource("teachers", currentCount),
    canAddUser: (currentCount: number) => canAccessResource("users", currentCount),
    showUpgradePrompt,
    limits,
  };
};