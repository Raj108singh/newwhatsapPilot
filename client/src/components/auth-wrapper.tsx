import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStatus } from "@/hooks/useAuth";
import LoginPage from "@/pages/login";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { isAuthenticated, isLoading, token } = useAuthStatus();
  const [location, setLocation] = useLocation();

  // Redirect to dashboard if user is authenticated and on root path
  useEffect(() => {
    if (isAuthenticated && location === '/') {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, location, setLocation]);

  // Show loading only when we have a token and are fetching user data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
          <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading...</span>
        </div>
      </div>
    );
  }

  // If no token or not authenticated, show login
  if (!token || !isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}