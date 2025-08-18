import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { LoginCredentials, AuthUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface LoginResult {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
}

export function useAuthStatus() {
  const token = localStorage.getItem('auth_token');
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: () => apiRequest('/api/auth/me'),
    enabled: !!token,
    retry: false,
    staleTime: 0, // Always fresh
    refetchOnMount: true,
  });

  return {
    user,
    isAuthenticated: !!user && !!token && !error,
    isLoading: isLoading && !!token,
    token,
  };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResult> => {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      return result;
    },
    onSuccess: (data: LoginResult) => {
      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
        // Force refresh the auth state
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        queryClient.refetchQueries({ queryKey: ['/api/auth/me'] });
        
        // Redirect to dashboard after successful login
        setLocation('/dashboard');
        
        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user?.name || data.user?.username}!`,
        });
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login error",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    },
    onSuccess: () => {
      localStorage.removeItem('auth_token');
      queryClient.clear();
      // Force redirect to login by refreshing the page or triggering re-render
      window.location.reload();
      toast({
        title: "Logged out successfully",
      });
    },
  });
}