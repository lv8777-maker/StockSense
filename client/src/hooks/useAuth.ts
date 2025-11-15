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

  // Temporarily disable admin check - it was causing infinite request loops
  // TODO: Re-implement admin check with proper caching once the issue is resolved
  const isAdmin = false;
  const adminRole = undefined;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    adminRole,
  };
}
