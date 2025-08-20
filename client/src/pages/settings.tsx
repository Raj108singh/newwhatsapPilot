import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuthStatus } from "@/hooks/useAuth";
import { changePasswordSchema, updateProfileSchema, type ChangePassword, type UpdateProfile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Settings() {
  const [whatsappSettings, setWhatsappSettings] = useState({
    token: "",
    phoneNumberId: "",
    verifyToken: "",
    businessAccountId: ""
  });
  const [generalSettings, setGeneralSettings] = useState({
    businessName: "",
    timezone: "",
    company_logo: "",
    sidebar_logo: "",
    app_title: "WhatsApp Pro",
    header_text: "Business Messaging Platform",
    footer_text: "Powered by WhatsApp Pro"
  });

  const [themeSettings, setThemeSettings] = useState({
    // Background colors
    primary_bg_color: "#ffffff",
    secondary_bg_color: "#f8fafc",
    sidebar_bg_color: "#1e293b",
    card_bg_color: "#ffffff",
    // Text colors
    primary_text_color: "#1f2937",
    secondary_text_color: "#6b7280",
    heading_text_color: "#111827",
    sidebar_text_color: "#e2e8f0",
    sidebar_icon_color: "#94a3b8",
    sidebar_hover_bg: "#334155",
    // Accent colors
    primary_accent_color: "#3b82f6",
    secondary_accent_color: "#6366f1",
    success_color: "#10b981",
    warning_color: "#f59e0b",
    error_color: "#ef4444",
    // Border and shadow
    border_color: "#e5e7eb",
    shadow_color: "#00000010",
    // Button colors
    button_primary_bg: "#3b82f6",
    button_primary_text: "#ffffff",
    button_secondary_bg: "#f3f4f6",
    button_secondary_text: "#374151"
  });
  const [currentSettings, setCurrentSettings] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuthStatus();

  // Password change form
  const passwordForm = useForm<ChangePassword>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Profile update form
  const profileForm = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      username: user?.username || "",
    },
  });

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await apiRequest("/api/settings");
        setCurrentSettings(settings);
        setGeneralSettings({
          businessName: settings.businessName || "",
          timezone: settings.timezone || "",
          company_logo: settings.company_logo || "",
          sidebar_logo: settings.sidebar_logo || "",
          app_title: settings.app_title || "WhatsApp Pro",
          header_text: settings.header_text || "Business Messaging Platform",
          footer_text: settings.footer_text || "Powered by WhatsApp Pro"
        });
        
        // Load theme settings
        const themeData = {
          primary_bg_color: settings.primary_bg_color || "#ffffff",
          secondary_bg_color: settings.secondary_bg_color || "#f8fafc",
          sidebar_bg_color: settings.sidebar_bg_color || "#1e293b",
          card_bg_color: settings.card_bg_color || "#ffffff",
          primary_text_color: settings.primary_text_color || "#1f2937",
          secondary_text_color: settings.secondary_text_color || "#6b7280",
          heading_text_color: settings.heading_text_color || "#111827",
          sidebar_text_color: settings.sidebar_text_color || "#e2e8f0",
          sidebar_icon_color: settings.sidebar_icon_color || "#94a3b8",
          sidebar_hover_bg: settings.sidebar_hover_bg || "#334155",
          primary_accent_color: settings.primary_accent_color || "#3b82f6",
          secondary_accent_color: settings.secondary_accent_color || "#6366f1",
          success_color: settings.success_color || "#10b981",
          warning_color: settings.warning_color || "#f59e0b",
          error_color: settings.error_color || "#ef4444",
          border_color: settings.border_color || "#e5e7eb",
          shadow_color: settings.shadow_color || "#00000010",
          button_primary_bg: settings.button_primary_bg || "#3b82f6",
          button_primary_text: settings.button_primary_text || "#ffffff",
          button_secondary_bg: settings.button_secondary_bg || "#f3f4f6",
          button_secondary_text: settings.button_secondary_text || "#374151"
        };
        setThemeSettings(themeData);
        
        // Apply theme to document
        applyThemeToDocument(themeData);
        
        // Also populate WhatsApp settings
        setWhatsappSettings({
          token: settings.whatsapp_token || "",
          phoneNumberId: settings.whatsapp_phone_number_id || "",
          verifyToken: settings.whatsapp_verify_token || "",
          businessAccountId: settings.whatsapp_business_account_id || ""
        });
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update profile form when user data is available
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        email: user.email,
        username: user.username,
      });
    }
  }, [user, profileForm]);

  const handleGeneralUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingGeneral(true);

    try {
      await apiRequest("/api/settings", {
        method: "POST",
        body: JSON.stringify(generalSettings),
      });

      toast({
        title: "General Settings Saved",
        description: "Your general settings have been updated successfully.",
      });
      
      // Update current settings to reflect changes
      setCurrentSettings((prev: any) => ({ ...prev, ...generalSettings }));
      
      // Invalidate cache to update sidebar and other components instantly
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save general settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleWhatsAppUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const response = await apiRequest("/api/settings", {
        method: "POST",
        body: JSON.stringify(whatsappSettings),
      });

      toast({
        title: "Settings Saved",
        description: "WhatsApp settings saved successfully!",
      });
      
      // Reload settings to update the status
      try {
        const updatedSettings = await apiRequest("/api/settings");
        setCurrentSettings(updatedSettings);
      } catch (error) {
        console.error("Failed to reload settings:", error);
      }
      
      // Clear the form for security
      setWhatsappSettings({
        token: "",
        phoneNumberId: "",
        verifyToken: "",
        businessAccountId: ""
      });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save WhatsApp settings",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThemeUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingTheme(true);

    try {
      await apiRequest("/api/settings", {
        method: "POST",
        body: JSON.stringify(themeSettings),
      });

      toast({
        title: "Theme Settings Saved",
        description: "Your theme customization has been updated successfully.",
      });
      
      // Update current settings to reflect changes
      setCurrentSettings((prev: any) => ({ ...prev, ...themeSettings }));
      
      // Apply theme immediately to CSS variables
      applyThemeToDocument(themeSettings);
      
      // Invalidate cache to update theme instantly
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save theme settings",
        variant: "destructive",
      });
    } finally {
      setIsSavingTheme(false);
    }
  };

  const applyThemeToDocument = (theme: typeof themeSettings) => {
    const root = document.documentElement;
    
    // Apply theme variables to CSS custom properties
    root.style.setProperty('--theme-primary-bg', theme.primary_bg_color);
    root.style.setProperty('--theme-secondary-bg', theme.secondary_bg_color);
    root.style.setProperty('--theme-sidebar-bg', theme.sidebar_bg_color);
    root.style.setProperty('--theme-card-bg', theme.card_bg_color);
    root.style.setProperty('--theme-primary-text', theme.primary_text_color);
    root.style.setProperty('--theme-secondary-text', theme.secondary_text_color);
    root.style.setProperty('--theme-heading-text', theme.heading_text_color);
    root.style.setProperty('--theme-sidebar-text', theme.sidebar_text_color);
    root.style.setProperty('--theme-sidebar-icon', theme.sidebar_icon_color);
    root.style.setProperty('--theme-sidebar-hover-bg', theme.sidebar_hover_bg);
    root.style.setProperty('--theme-primary-accent', theme.primary_accent_color);
    root.style.setProperty('--theme-secondary-accent', theme.secondary_accent_color);
    root.style.setProperty('--theme-success', theme.success_color);
    root.style.setProperty('--theme-warning', theme.warning_color);
    root.style.setProperty('--theme-error', theme.error_color);
    root.style.setProperty('--theme-border', theme.border_color);
    root.style.setProperty('--theme-shadow', theme.shadow_color);
    root.style.setProperty('--theme-button-primary-bg', theme.button_primary_bg);
    root.style.setProperty('--theme-button-primary-text', theme.button_primary_text);
    root.style.setProperty('--theme-button-secondary-bg', theme.button_secondary_bg);
    root.style.setProperty('--theme-button-secondary-text', theme.button_secondary_text);

    // Also update main background and text colors for immediate visual effect
    root.style.setProperty('--background', theme.primary_bg_color);
    root.style.setProperty('--foreground', theme.primary_text_color);
    root.style.setProperty('--card', theme.card_bg_color);
    root.style.setProperty('--card-foreground', theme.primary_text_color);
    root.style.setProperty('--sidebar', theme.sidebar_bg_color);
    root.style.setProperty('--sidebar-foreground', theme.sidebar_text_color);
    root.style.setProperty('--primary', theme.primary_accent_color);
    root.style.setProperty('--border', theme.border_color);
  };

  const resetThemeToDefault = () => {
    const defaultTheme = {
      primary_bg_color: "#ffffff",
      secondary_bg_color: "#f8fafc",
      sidebar_bg_color: "#1e293b",
      card_bg_color: "#ffffff",
      primary_text_color: "#1f2937",
      secondary_text_color: "#6b7280",
      heading_text_color: "#111827",
      sidebar_text_color: "#e2e8f0",
      sidebar_icon_color: "#94a3b8",
      sidebar_hover_bg: "#334155",
      primary_accent_color: "#3b82f6",
      secondary_accent_color: "#6366f1",
      success_color: "#10b981",
      warning_color: "#f59e0b",
      error_color: "#ef4444",
      border_color: "#e5e7eb",
      shadow_color: "#00000010",
      button_primary_bg: "#3b82f6",
      button_primary_text: "#ffffff",
      button_secondary_bg: "#f3f4f6",
      button_secondary_text: "#374151"
    };
    setThemeSettings(defaultTheme);
    applyThemeToDocument(defaultTheme);
  };

  const handlePasswordChange = async (data: ChangePassword) => {
    try {
      await apiRequest("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      });

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });

      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    }
  };

  const handleProfileUpdate = async (data: UpdateProfile) => {
    try {
      await apiRequest("/api/auth/update-profile", {
        method: "POST", 
        body: JSON.stringify(data),
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Profile Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleCompanyLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setGeneralSettings(prev => ({ ...prev, company_logo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">
              {currentSettings?.header_text || 'Manage your WhatsApp Pro configuration'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="whatsapp" className="space-y-10">
            <TabsList className="grid w-full grid-cols-5 bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 p-3 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-gray-600 backdrop-blur-sm relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-400/10 before:via-purple-400/10 before:to-pink-400/10 before:rounded-2xl min-h-[5rem]">
              <TabsTrigger 
                value="whatsapp" 
                className="relative z-10 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500 data-[state=active]:via-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-green-500/25 data-[state=active]:transform data-[state=active]:scale-105 data-[state=active]:border-2 data-[state=active]:border-green-300 hover:bg-green-50 hover:text-green-700 hover:scale-102 transition-all duration-300 font-medium rounded-lg px-3 py-4 flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200 min-h-[4rem]"
              >
                <i className="fab fa-whatsapp text-lg"></i>
                <span className="hidden sm:inline font-semibold text-sm">WhatsApp API</span>
                <span className="sm:hidden font-semibold text-xs">API</span>
              </TabsTrigger>
              <TabsTrigger 
                value="general" 
                className="relative z-10 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:via-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-blue-500/25 data-[state=active]:transform data-[state=active]:scale-105 data-[state=active]:border-2 data-[state=active]:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:scale-102 transition-all duration-300 font-medium rounded-lg px-3 py-4 flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200 min-h-[4rem]"
              >
                <i className="fas fa-cogs text-lg"></i>
                <span className="hidden sm:inline font-semibold text-sm">General</span>
                <span className="sm:hidden font-semibold text-xs">General</span>
              </TabsTrigger>
              <TabsTrigger 
                value="admin" 
                className="relative z-10 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500 data-[state=active]:via-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-purple-500/25 data-[state=active]:transform data-[state=active]:scale-105 data-[state=active]:border-2 data-[state=active]:border-purple-300 hover:bg-purple-50 hover:text-purple-700 hover:scale-102 transition-all duration-300 font-medium rounded-lg px-3 py-4 flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200 min-h-[4rem]"
              >
                <i className="fas fa-user-shield text-lg"></i>
                <span className="hidden sm:inline font-semibold text-sm">Admin</span>
                <span className="sm:hidden font-semibold text-xs">Admin</span>
              </TabsTrigger>

              <TabsTrigger 
                value="theme" 
                className="relative z-10 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500 data-[state=active]:via-teal-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-cyan-500/25 data-[state=active]:transform data-[state=active]:scale-105 data-[state=active]:border-2 data-[state=active]:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 hover:scale-102 transition-all duration-300 font-medium rounded-lg px-3 py-4 flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200 min-h-[4rem]"
              >
                <i className="fas fa-palette text-lg"></i>
                <span className="hidden sm:inline font-semibold text-sm">Theme Design</span>
                <span className="sm:hidden font-semibold text-xs">Theme</span>
              </TabsTrigger>

              <TabsTrigger 
                value="notifications" 
                className="relative z-10 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500 data-[state=active]:via-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-orange-500/25 data-[state=active]:transform data-[state=active]:scale-105 data-[state=active]:border-2 data-[state=active]:border-orange-300 hover:bg-orange-50 hover:text-orange-700 hover:scale-102 transition-all duration-300 font-medium rounded-lg px-3 py-4 flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200 min-h-[4rem]"
              >
                <i className="fas fa-bell text-lg"></i>
                <span className="hidden sm:inline font-semibold text-sm">Notifications</span>
                <span className="sm:hidden font-semibold text-xs">Alerts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-800 dark:to-gray-700 border-green-200 dark:border-gray-600 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <i className="fab fa-whatsapp text-white text-xl"></i>
                    </div>
                    WhatsApp Business API Configuration
                  </CardTitle>
                  <p className="text-green-100 text-sm mt-2">Connect your WhatsApp Business account to send messages</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWhatsAppUpdate} className="space-y-4">
                    <div>
                      <Label htmlFor="token">Access Token</Label>
                      <Input
                        id="token"
                        type="password"
                        value={whatsappSettings.token}
                        onChange={(e) => setWhatsappSettings(prev => ({ ...prev, token: e.target.value }))}
                        placeholder="Enter your WhatsApp Business API token"
                        data-testid="input-whatsapp-token"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Get this from Meta Business Manager → WhatsApp → API Setup
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                      <Input
                        id="phoneNumberId"
                        value={whatsappSettings.phoneNumberId}
                        onChange={(e) => setWhatsappSettings(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                        placeholder="Enter your phone number ID"
                        data-testid="input-phone-number-id"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Found in your WhatsApp Business API dashboard
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="verifyToken">Verify Token</Label>
                      <Input
                        id="verifyToken"
                        value={whatsappSettings.verifyToken}
                        onChange={(e) => setWhatsappSettings(prev => ({ ...prev, verifyToken: e.target.value }))}
                        placeholder="Enter your webhook verify token"
                        data-testid="input-verify-token"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        A secure string you create for webhook verification
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="businessAccountId">Business Account ID</Label>
                      <Input
                        id="businessAccountId"
                        value={whatsappSettings.businessAccountId}
                        onChange={(e) => setWhatsappSettings(prev => ({ ...prev, businessAccountId: e.target.value }))}
                        placeholder="Enter your WhatsApp Business Account ID"
                        data-testid="input-business-account-id"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Required for template refreshing from your WhatsApp Business account
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button 
                        type="submit" 
                        disabled={isUpdating}
                        data-testid="button-update-whatsapp-settings"
                      >
                        {isUpdating ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Updating...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>
                            Update Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-gray-800 dark:to-gray-700 border-emerald-200 dark:border-gray-600 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <i className="fas fa-info-circle text-white"></i>
                    </div>
                    Current Configuration
                  </CardTitle>
                  <p className="text-emerald-100 text-sm mt-2">View your current WhatsApp API settings</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="text-center py-4">
                        <i className="fas fa-spinner fa-spin text-slate-400 mb-2"></i>
                        <p className="text-sm text-slate-500">Loading settings...</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-medium">API Status</span>
                          <span className={`text-sm ${currentSettings?.whatsappConfigured ? 'text-green-600' : 'text-red-600'}`}>
                            {currentSettings?.whatsappConfigured ? 'Connected' : 'Not Configured'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-medium">Business Name</span>
                          <span className="text-sm text-slate-600">
                            {currentSettings?.businessName || 'Not set'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-medium">Webhook URL</span>
                          <code className="text-xs bg-white px-2 py-1 rounded">
                            {currentSettings?.webhookUrl || `${window.location.origin}/api/webhook`}
                          </code>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-medium">Timezone</span>
                          <span className="text-sm text-slate-600">
                            {currentSettings?.timezone || 'UTC'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              {/* User Profile Section */}
              <Card className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-800 dark:to-gray-700 border-purple-200 dark:border-gray-600 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <i className="fas fa-user-circle text-white"></i>
                    </div>
                    User Profile
                  </CardTitle>
                  <p className="text-purple-100 text-sm mt-2">Manage your account information</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={generalSettings.company_logo} alt="Profile" />
                      <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-medium">{user?.name}</h3>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role} User</p>
                    </div>
                  </div>

                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" data-testid="input-profile-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" data-testid="input-profile-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" data-testid="input-profile-username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={profileForm.formState.isSubmitting} data-testid="button-update-profile">
                        {profileForm.formState.isSubmitting ? "Updating..." : "Update Profile"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Change Password Section */}
              <Card className="bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-800 dark:to-gray-700 border-red-200 dark:border-gray-600 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <i className="fas fa-key text-white"></i>
                    </div>
                    Change Password
                  </CardTitle>
                  <p className="text-red-100 text-sm mt-2">Update your account password for security</p>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter current password" data-testid="input-current-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter new password" data-testid="input-new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm new password" data-testid="input-confirm-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={passwordForm.formState.isSubmitting} data-testid="button-change-password">
                        {passwordForm.formState.isSubmitting ? "Changing..." : "Change Password"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Company Logo Upload Section */}
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 border-indigo-200 dark:border-gray-600 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <i className="fas fa-image text-white"></i>
                    </div>
                    Company Logo
                  </CardTitle>
                  <p className="text-indigo-100 text-sm mt-2">Upload your company logo for branding</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {generalSettings.company_logo && (
                      <div className="flex items-center space-x-4">
                        <img 
                          src={generalSettings.company_logo} 
                          alt="Company Logo" 
                          className="w-16 h-16 object-contain border rounded"
                        />
                        <div>
                          <p className="text-sm font-medium">Current Logo</p>
                          <p className="text-xs text-muted-foreground">Logo is uploaded and ready</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <Label htmlFor="company-logo">Upload New Logo</Label>
                      <Input
                        id="company-logo"
                        type="file"
                        accept="image/*"
                        onChange={handleCompanyLogoUpload}
                        className="mt-1"
                        data-testid="input-company-logo"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported formats: JPG, PNG, GIF. Max size: 2MB
                      </p>
                    </div>
                    <Button 
                      onClick={() => handleGeneralUpdate()}
                      disabled={isSavingGeneral || !generalSettings.company_logo}
                      data-testid="button-save-logo"
                    >
                      {isSavingGeneral ? "Saving..." : "Save Logo"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="general" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-800 dark:to-gray-700 border-emerald-200 dark:border-gray-600">
                <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <i className="fas fa-cogs text-white"></i>
                    </div>
                    General Settings
                  </CardTitle>
                  <p className="text-emerald-100 text-sm mt-2">Configure your business information and preferences</p>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleGeneralUpdate} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                        <i className="fas fa-building text-emerald-600"></i>
                        Business Name
                      </Label>
                      <Input
                        id="businessName"
                        value={generalSettings.businessName}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Enter your business name"
                        data-testid="input-business-name"
                        className="border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400 transition-colors"
                      />
                      <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                        <i className="fas fa-info-circle"></i>
                        This appears in various parts of your application
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                        <i className="fas fa-globe text-teal-600"></i>
                        Timezone
                      </Label>
                      <Input
                        id="timezone"
                        value={generalSettings.timezone}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        placeholder="e.g., America/New_York, UTC, Asia/Kolkata"
                        data-testid="input-timezone"
                        className="border-teal-200 focus:border-teal-400 focus:ring-teal-400 transition-colors"
                      />
                      <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
                        <i className="fas fa-info-circle"></i>
                        Used for scheduling and timestamps
                      </p>
                    </div>
                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={isSavingGeneral}
                        data-testid="button-save-general"
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                      >
                        {isSavingGeneral ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>
                            Save General Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <i className="fas fa-palette text-white"></i>
                    </div>
                    Branding & Customization
                  </CardTitle>
                  <p className="text-blue-100 text-sm mt-2">Personalize your WhatsApp Pro experience with custom branding</p>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleGeneralUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="appTitle" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                        <i className="fas fa-heading text-blue-600"></i>
                        Application Title
                      </Label>
                      <Input
                        id="appTitle"
                        value={generalSettings.app_title}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, app_title: e.target.value }))}
                        placeholder="WhatsApp Pro"
                        data-testid="input-app-title"
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 transition-colors"
                      />
                      <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                        <i className="fas fa-info-circle"></i>
                        This appears in the sidebar and browser title
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sidebarLogo" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                        <i className="fas fa-image text-green-600"></i>
                        Sidebar Logo URL
                      </Label>
                      <Input
                        id="sidebarLogo"
                        value={generalSettings.sidebar_logo}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, sidebar_logo: e.target.value }))}
                        placeholder="https://example.com/logo.png (leave empty for default)"
                        data-testid="input-sidebar-logo"
                        className="border-green-200 focus:border-green-400 focus:ring-green-400 transition-colors"
                      />
                      {generalSettings.sidebar_logo && (
                        <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                          <img 
                            src={generalSettings.sidebar_logo} 
                            alt="Preview" 
                            className="w-8 h-8 object-contain rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <p className="text-sm text-green-700 dark:text-green-300">Preview of your logo</p>
                        </div>
                      )}
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <i className="fas fa-info-circle"></i>
                        URL to your logo image (recommended: 48x48px or higher)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="headerText" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                        <i className="fas fa-newspaper text-purple-600"></i>
                        Header Text
                      </Label>
                      <Input
                        id="headerText"
                        value={generalSettings.header_text}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, header_text: e.target.value }))}
                        placeholder="Business Messaging Platform"
                        data-testid="input-header-text"
                        className="border-purple-200 focus:border-purple-400 focus:ring-purple-400 transition-colors"
                      />
                      <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                        <i className="fas fa-info-circle"></i>
                        Subtitle text that appears in page headers
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="footerText" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                        <i className="fas fa-align-center text-orange-600"></i>
                        Footer Text
                      </Label>
                      <Input
                        id="footerText"
                        value={generalSettings.footer_text}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, footer_text: e.target.value }))}
                        placeholder="Powered by WhatsApp Pro"
                        data-testid="input-footer-text"
                        className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 transition-colors"
                      />
                      <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                        <i className="fas fa-info-circle"></i>
                        Text displayed at the bottom of pages
                      </p>
                    </div>
                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={isSavingGeneral}
                        data-testid="button-save-branding"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                      >
                        {isSavingGeneral ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-magic mr-2"></i>
                            Save Branding Settings
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>



            <TabsContent value="theme" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <i className="fas fa-palette text-white"></i>
                    </div>
                    System Theme Design
                  </CardTitle>
                  <p className="text-purple-100 text-sm mt-2">Customize colors, backgrounds, and visual design for the entire system</p>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleThemeUpdate} className="space-y-6">
                    
                    {/* Background Colors Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <i className="fas fa-fill-drip text-purple-600"></i>
                        Background Colors
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primaryBg" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Primary Background
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="primaryBg"
                              type="color"
                              value={themeSettings.primary_bg_color}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, primary_bg_color: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.primary_bg_color}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, primary_bg_color: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              placeholder="#ffffff"
                              className="flex-1 focus:border-purple-400 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondaryBg" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Secondary Background
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="secondaryBg"
                              type="color"
                              value={themeSettings.secondary_bg_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, secondary_bg_color: e.target.value }))}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.secondary_bg_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, secondary_bg_color: e.target.value }))}
                              placeholder="#f8fafc"
                              className="flex-1 focus:border-purple-400 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sidebarBg" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Sidebar Background
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="sidebarBg"
                              type="color"
                              value={themeSettings.sidebar_bg_color}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, sidebar_bg_color: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.sidebar_bg_color}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, sidebar_bg_color: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              placeholder="#1e293b"
                              className="flex-1 focus:border-purple-400 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardBg" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Card Background
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="cardBg"
                              type="color"
                              value={themeSettings.card_bg_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, card_bg_color: e.target.value }))}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.card_bg_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, card_bg_color: e.target.value }))}
                              placeholder="#ffffff"
                              className="flex-1 focus:border-purple-400 focus:ring-purple-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sidebar Colors Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <i className="fas fa-bars text-indigo-600"></i>
                        Sidebar Colors
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sidebarIcon" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Sidebar Icon Color
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="sidebarIcon"
                              type="color"
                              value={themeSettings.sidebar_icon_color}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, sidebar_icon_color: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.sidebar_icon_color}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, sidebar_icon_color: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              placeholder="#94a3b8"
                              className="flex-1 focus:border-indigo-400 focus:ring-indigo-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sidebarHover" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Sidebar Hover Background
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="sidebarHover"
                              type="color"
                              value={themeSettings.sidebar_hover_bg}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, sidebar_hover_bg: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.sidebar_hover_bg}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, sidebar_hover_bg: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              placeholder="#334155"
                              className="flex-1 focus:border-indigo-400 focus:ring-indigo-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Text Colors Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <i className="fas fa-font text-blue-600"></i>
                        Text Colors
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primaryText" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Primary Text
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="primaryText"
                              type="color"
                              value={themeSettings.primary_text_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, primary_text_color: e.target.value }))}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.primary_text_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, primary_text_color: e.target.value }))}
                              placeholder="#1f2937"
                              className="flex-1 focus:border-blue-400 focus:ring-blue-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondaryText" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Secondary Text
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="secondaryText"
                              type="color"
                              value={themeSettings.secondary_text_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, secondary_text_color: e.target.value }))}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.secondary_text_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, secondary_text_color: e.target.value }))}
                              placeholder="#6b7280"
                              className="flex-1 focus:border-blue-400 focus:ring-blue-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="headingText" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Heading Text
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="headingText"
                              type="color"
                              value={themeSettings.heading_text_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, heading_text_color: e.target.value }))}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.heading_text_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, heading_text_color: e.target.value }))}
                              placeholder="#111827"
                              className="flex-1 focus:border-blue-400 focus:ring-blue-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sidebarText" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Sidebar Text Color
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="sidebarText"
                              type="color"
                              value={themeSettings.sidebar_text_color}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, sidebar_text_color: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.sidebar_text_color}
                              onChange={(e) => {
                                const newSettings = { ...themeSettings, sidebar_text_color: e.target.value };
                                setThemeSettings(newSettings);
                                applyThemeToDocument(newSettings);
                              }}
                              placeholder="#e2e8f0"
                              className="flex-1 focus:border-blue-400 focus:ring-blue-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Accent Colors Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <i className="fas fa-star text-yellow-600"></i>
                        Accent Colors
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primaryAccent" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Primary Accent
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="primaryAccent"
                              type="color"
                              value={themeSettings.primary_accent_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, primary_accent_color: e.target.value }))}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.primary_accent_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, primary_accent_color: e.target.value }))}
                              placeholder="#3b82f6"
                              className="flex-1 focus:border-yellow-400 focus:ring-yellow-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondaryAccent" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Secondary Accent
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="secondaryAccent"
                              type="color"
                              value={themeSettings.secondary_accent_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, secondary_accent_color: e.target.value }))}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.secondary_accent_color}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, secondary_accent_color: e.target.value }))}
                              placeholder="#6366f1"
                              className="flex-1 focus:border-yellow-400 focus:ring-yellow-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Button Colors Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <i className="fas fa-mouse-pointer text-green-600"></i>
                        Button Colors
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="buttonPrimaryBg" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Primary Button Background
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="buttonPrimaryBg"
                              type="color"
                              value={themeSettings.button_primary_bg}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, button_primary_bg: e.target.value }))}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.button_primary_bg}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, button_primary_bg: e.target.value }))}
                              placeholder="#3b82f6"
                              className="flex-1 focus:border-green-400 focus:ring-green-400"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="buttonPrimaryText" className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                            Primary Button Text
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="buttonPrimaryText"
                              type="color"
                              value={themeSettings.button_primary_text}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, button_primary_text: e.target.value }))}
                              className="w-16 h-10 border-2 rounded-lg cursor-pointer"
                            />
                            <Input
                              value={themeSettings.button_primary_text}
                              onChange={(e) => setThemeSettings(prev => ({ ...prev, button_primary_text: e.target.value }))}
                              placeholder="#ffffff"
                              className="flex-1 focus:border-green-400 focus:ring-green-400"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-4 pt-6">
                      <Button 
                        type="submit" 
                        disabled={isSavingTheme}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                      >
                        {isSavingTheme ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Saving Theme Settings...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>
                            Save Theme Settings
                          </>
                        )}
                      </Button>
                      <Button 
                        type="button" 
                        onClick={resetThemeToDefault}
                        variant="outline"
                        className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 rounded-lg transition-all duration-200"
                      >
                        <i className="fas fa-undo mr-2"></i>
                        Reset to Default
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
              <Card className="bg-gradient-to-br from-orange-50 to-red-100 dark:from-gray-800 dark:to-gray-700 border-orange-200 dark:border-gray-600 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                      <i className="fas fa-bell text-white"></i>
                    </div>
                    Notification Preferences
                  </CardTitle>
                  <p className="text-orange-100 text-sm mt-2">Configure how you receive notifications</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Campaign Notifications</Label>
                        <p className="text-sm text-slate-500">Get notified when campaigns complete</p>
                      </div>
                      <Button variant="outline" size="sm" data-testid="toggle-campaign-notifications">
                        Enabled
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Message Alerts</Label>
                        <p className="text-sm text-slate-500">Get notified of new incoming messages</p>
                      </div>
                      <Button variant="outline" size="sm" data-testid="toggle-message-alerts">
                        Enabled
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}