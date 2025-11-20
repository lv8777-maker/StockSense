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

  // Check admin status - only fetch once when user exists
  // 403 response means user is not an admin (not an error)
  const { data: adminProfile } = useQuery<AdminProfile>({
    queryKey: ["/api/admin/profile"],
    enabled: !!user, // Only run if user is authenticated
    retry: false, // Don't retry on 403
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount
    refetchOnReconnect: false, // Don't refetch on reconnect
    staleTime: Infinity, // Cache forever (admin status doesn't change during session)
    // Custom query function that treats 403 as "not admin" (not an error)
    queryFn: async () => {
      const response = await fetch("/api/admin/profile", {
        credentials: "include",
      });
      
      // If 403, user is not an admin - return null instead of throwing
      if (response.status === 403) {
        return null;
      }
      
      // For other errors, throw to trigger error state
      if (!response.ok) {
        throw new Error("Failed to fetch admin profile");
      }
      
      return response.json();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: !!adminProfile,
    adminRole: adminProfile?.role,
  };
}
