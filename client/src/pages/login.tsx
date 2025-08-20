import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Eye, EyeOff, Shield, Zap, Users, ArrowRight } from "lucide-react";
import { loginSchema, type LoginCredentials } from "@shared/schema";
import { useLogin } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const loginMutation = useLogin();

  // Load login page settings from database
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      {/* Subtle background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" 
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.15) 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}>
        </div>
      </div>

      <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-12 items-center relative z-10">
        
        {/* Left Side - Enhanced Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-12 px-8">
          {/* Logo and Title Section */}
          <div className="space-y-8">
            <div className="flex items-center space-x-5">
              <div className="relative">
                {settings?.login_logo ? (
                  <img 
                    src={settings.login_logo} 
                    alt="Logo" 
                    className="w-20 h-20 rounded-2xl shadow-lg object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                  {settings?.login_title || "WhatsApp Pro"}
                </h1>
                <div className="w-32 h-1 bg-blue-600 rounded-full mt-3"></div>
                <p className="text-xl text-gray-600 dark:text-gray-300 font-semibold mt-4">
                  {settings?.login_subtitle || "Professional WhatsApp Business Management Platform"}
                </p>
              </div>
            </div>
          </div>

          {/* Features Section with enhanced design */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
              Powerful Features for Modern Business
            </h2>
            
            <div className="group">
              <div className="flex items-start space-x-6 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {settings?.login_feature_1_title || "Automated Responses"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                    {settings?.login_feature_1_description || "Smart chatbot with AI-powered auto-reply rules for instant customer support"}
                  </p>
                </div>
              </div>
            </div>

            <div className="group">
              <div className="flex items-start space-x-6 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center shadow-md">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {settings?.login_feature_2_title || "Bulk Messaging"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                    {settings?.login_feature_2_description || "Send personalized messages to thousands of contacts with templates"}
                  </p>
                </div>
              </div>
            </div>

            <div className="group">
              <div className="flex items-start space-x-6 p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                    {settings?.login_feature_3_title || "Secure & Reliable"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                    {settings?.login_feature_3_description || "Enterprise-grade security with real-time message tracking and status updates"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Enhanced Login Form */}
        <div className="w-full max-w-lg mx-auto lg:mx-0">
          <div className="relative">
            {/* Glassmorphism card with enhanced styling */}
            <Card className="border-0 shadow-2xl backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 rounded-3xl overflow-hidden">
              {/* Mobile header with enhanced design */}
              <div className="lg:hidden text-center p-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-black text-white tracking-tight">
                    WhatsApp Pro
                  </span>
                </div>
                <p className="text-white/90 font-medium">
                  Enterprise Business Messaging Platform
                </p>
              </div>

              <CardHeader className="space-y-6 p-8 lg:p-10">
                <div className="text-center space-y-4">
                  <CardTitle className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                    Welcome Back
                  </CardTitle>
                  <CardDescription className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                    Sign in to access your business dashboard
                  </CardDescription>
                  <div className="w-24 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full mx-auto"></div>
                </div>
              </CardHeader>

              <CardContent className="p-8 lg:p-10 pt-0">
                {loginMutation.error && (
                  <Alert variant="destructive" className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 rounded-2xl">
                    <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
                      Invalid credentials. Please check your username and password.
                    </AlertDescription>
                  </Alert>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-800 dark:text-gray-200 font-semibold text-sm uppercase tracking-wider">
                            Username
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input
                                placeholder="Enter your username"
                                className="h-14 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 font-medium"
                                data-testid="input-username"
                                {...field}
                              />
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            </div>
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
                          <FormLabel className="text-gray-800 dark:text-gray-200 font-semibold text-sm uppercase tracking-wider">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                className="h-14 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800 transition-all duration-300 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 font-medium pr-14"
                                data-testid="input-password"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-2 h-10 w-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <EyeOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                ) : (
                                  <Eye className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                )}
                              </Button>
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full h-14 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center space-x-3">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Signing you in...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-3">
                          <span>Access Dashboard</span>
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      )}
                    </Button>

                    {/* Professional footer */}
                    <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center justify-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span>Secure enterprise-grade authentication</span>
                      </p>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Security badge */}
            <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-full shadow-xl flex items-center space-x-2 text-sm font-bold">
              <Shield className="w-4 h-4" />
              <span>256-bit SSL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}