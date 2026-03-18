import { useAuth } from "../context/AuthContext";
import { SchoolData } from "../types/database";
import { useState, useEffect } from "react";

export const useSchoolData = (): SchoolData => {
  const { user } = useAuth();
  const [schoolData, setSchoolData] = useState<SchoolData>({
    schoolName: "",
    schoolEmail: "",
    schoolIdentifier: "",
    schoolAddress: "",
    schoolPhone: "",
    schoolTaxNumber: "",
  });

  useEffect(() => {
    console.log("🏫 useSchoolData - user changed:", user?.email);
    
    if (!user) {
      console.log("🏫 useSchoolData - no user, setting defaults");
      setSchoolData({
        schoolName: "المدرسة",
        schoolEmail: "",
        schoolIdentifier: "school",
        schoolAddress: "العنوان غير محدد",
        schoolPhone: "رقم الهاتف غير محدد",
        schoolTaxNumber: "000-000-000",
      });
      return;
    }

    const schoolName = (user as any).schoolName || user.email?.split("@")[0] || "المدرسة";
    
    console.log("🏫 useSchoolData - schoolName set to:", schoolName);

    setSchoolData({
      schoolName: schoolName,
      schoolEmail: user.email || "",
      schoolIdentifier: user.email?.split("@")[0] || "school",
      schoolAddress: (user as any).schoolAddress || "العنوان غير محدد",
      schoolPhone: (user as any).schoolPhone || "رقم الهاتف غير محدد",
      schoolTaxNumber: (user as any).taxNumber || "000-000-000",
    });
    
  }, [user]);

  return schoolData;
};