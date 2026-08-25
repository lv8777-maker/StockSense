import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Error bodies are JSON (e.g. { message: "..." }); try to parse and use
    // the message field first so callers see a clean string instead of raw
    // JSON syntax. Fall back to the raw text if parsing fails or there's no
    // message field.
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.message === "string") {
        message = parsed.message;
      }
    } catch {
      // Not JSON — use the raw text as-is.
    }
    throw new Error(`${res.status}: ${message}`);
  }
}

// CSRF token management
let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  
  try {
    const res = await fetch("/api/csrf-token", {
      credentials: "include",
    });
    
    if (!res.ok) {
      throw new Error("Failed to fetch CSRF token");
    }
    
    const { csrfToken: token } = await res.json();
    csrfToken = token;
    return token;
  } catch (error) {
    console.error("CSRF token fetch failed:", error);
    // Return empty string as fallback - backend will reject but won't crash
    return "";
  }
}

// Clear CSRF token on logout
export function clearCsrfToken() {
  csrfToken = null;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  
  // Add Content-Type for JSON requests
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  // Add CSRF token for state-changing requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    const token = await getCsrfToken();
    headers["x-csrf-token"] = token;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
