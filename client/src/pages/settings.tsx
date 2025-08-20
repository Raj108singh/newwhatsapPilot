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
  const [currentSettings, setCurrentSettings] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
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
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="whatsapp" className="space-y-6">
            <TabsList>
              <TabsTrigger value="whatsapp">WhatsApp API</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="whatsapp" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Business API Configuration</CardTitle>
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

              <Card>
                <CardHeader>
                  <CardTitle>Current Configuration</CardTitle>
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

            <TabsContent value="admin" className="space-y-6">
              {/* User Profile Section */}
              <Card>
                <CardHeader>
                  <CardTitle>User Profile</CardTitle>
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
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
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
              <Card>
                <CardHeader>
                  <CardTitle>Company Logo</CardTitle>
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

            <TabsContent value="general" className="space-y-6">
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

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
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