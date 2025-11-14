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
  // Note: 403 is expected for non-admin users, so we handle errors gracefully
  const { data: adminProfile, isLoading: isAdminLoading } = useQuery<AdminProfile>({
    queryKey: ["/api/admin/profile"],
    enabled: !!user,
    retry: false,
    meta: {
      // Suppress error toast for 403 responses (expected for non-admins)
      suppressErrorToast: true,
    },
  });

  return {
    user,
    isLoading: isLoading || (!!user && isAdminLoading),
    isAuthenticated: !!user,
    isAdmin: !!adminProfile,
    adminRole: adminProfile?.role,
  };
}
