import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Eye, EyeOff, Shield, Zap, Users } from "lucide-react";
import { loginSchema, type LoginCredentials } from "@shared/schema";
import { useLogin } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const loginMutation = useLogin();

  // Load login page settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsData = await apiRequest("/api/settings");
        setSettings(settingsData);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };
    loadSettings();
  }, []);

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  // Get dynamic settings with fallbacks
  const backgroundGradient = settings 
    ? `bg-gradient-to-br ${settings.login_background_gradient_from || 'from-blue-50'} ${settings.login_background_gradient_via || 'via-white'} ${settings.login_background_gradient_to || 'to-green-50'} dark:from-gray-900 dark:via-gray-800 dark:to-gray-900`
    : 'bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900';

  return (
    <div className={`min-h-screen ${backgroundGradient} flex items-center justify-center p-4`}>
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              {settings?.login_logo ? (
                <img src={settings.login_logo} alt="Logo" className="w-12 h-12 object-contain rounded-xl" />
              ) : (
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
              )}
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {settings?.login_title || 'WhatsApp Pro'}
              </span>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {settings?.login_subtitle || 'Professional WhatsApp Business Management Platform'}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {settings?.login_feature_1_title || 'Automated Responses'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {settings?.login_feature_1_description || 'Smart chatbot with AI-powered auto-reply rules for instant customer support'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {settings?.login_feature_2_title || 'Bulk Messaging'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {settings?.login_feature_2_description || 'Send personalized messages to thousands of contacts with templates'}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {settings?.login_feature_3_title || 'Secure & Reliable'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {settings?.login_feature_3_description || 'Enterprise-grade security with real-time message tracking and status updates'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="border-0 shadow-2xl">
            <CardHeader className="space-y-3 pb-6">
              <div className="lg:hidden flex items-center justify-center space-x-3 mb-4">
                {settings?.login_logo ? (
                  <img src={settings.login_logo} alt="Logo" className="w-10 h-10 object-contain rounded-xl" />
                ) : (
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                )}
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {settings?.login_title || 'WhatsApp Pro'}
                </span>
              </div>
              
              <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                {settings?.login_welcome_title || 'Welcome Back'}
              </CardTitle>
              <CardDescription className="text-center text-gray-600 dark:text-gray-400">
                {settings?.login_welcome_description || 'Sign in to access your WhatsApp Business dashboard'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {loginMutation.error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Invalid credentials. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">
                          Username
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your username"
                            className="h-12 border-gray-200 dark:border-gray-700"
                            data-testid="input-username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 dark:text-gray-300">
                          Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="h-12 border-gray-200 dark:border-gray-700 pr-12"
                              data-testid="input-password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4 text-gray-400" />
                              ) : (
                                <Eye className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Demo Credentials
                  </h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <p><strong>Username:</strong> admin</p>
                    <p><strong>Password:</strong> admin123</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}