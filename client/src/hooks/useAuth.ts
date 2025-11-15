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

  // Check if user is admin (only once per session)
  // 403 is expected for non-admin users
  const { data: adminProfile, isLoading: isAdminLoading, isError } = useQuery<AdminProfile>({
    queryKey: ["/api/admin/profile"],
    enabled: !!user,
    retry: false,
    staleTime: Infinity, // Cache admin status indefinitely during session
    gcTime: Infinity, // Keep in cache
  });

  return {
    user,
    isLoading: isLoading || (!!user && isAdminLoading),
    isAuthenticated: !!user,
    isAdmin: !!adminProfile && !isError,
    adminRole: adminProfile?.role,
  };
}
