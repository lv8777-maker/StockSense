import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface AdminProfile {
  id: string;
  email: string;
  role: string;
  userId?: string;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check if user is admin
  const { data: adminProfile, isLoading: isAdminLoading } = useQuery<AdminProfile>({
    queryKey: ["/api/admin/profile"],
    enabled: !!user,
    retry: false,
  });

  return {
    user,
    isLoading: isLoading || (!!user && isAdminLoading),
    isAuthenticated: !!user,
    isAdmin: !!adminProfile,
    adminRole: adminProfile?.role,
  };
}
