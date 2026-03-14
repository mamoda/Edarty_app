import { useAuth } from "../context/AuthContext";
import { SchoolData } from "../types/database";

export const useSchoolData = (): SchoolData => {
  const { user } = useAuth();
  
  const getSchoolName = (): string => {
    if (!user) return "المدرسة";
    return (user as any).schoolName || user.email?.split("@")[0] || "المدرسة";
  };

  const getSchoolEmail = (): string => {
    return user?.email || "";
  };

  const getSchoolIdentifier = (): string => {
    return user?.email?.split("@")[0] || "school";
  };

  const getSchoolAddress = (): string => {
    return (user as any).schoolAddress || "العنوان غير محدد";
  };

  const getSchoolPhone = (): string => {
    return (user as any).schoolPhone || "رقم الهاتف غير محدد";
  };

  const getSchoolTaxNumber = (): string => {
    return (user as any).taxNumber || "000-000-000";
  };

  return {
    schoolName: getSchoolName(),
    schoolEmail: getSchoolEmail(),
    schoolIdentifier: getSchoolIdentifier(),
    schoolAddress: getSchoolAddress(),
    schoolPhone: getSchoolPhone(),
    schoolTaxNumber: getSchoolTaxNumber(),
  };
};