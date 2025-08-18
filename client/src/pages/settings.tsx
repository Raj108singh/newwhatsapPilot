import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [whatsappSettings, setWhatsappSettings] = useState({
    token: "",
    phoneNumberId: "",
    verifyToken: ""
  });
  const [generalSettings, setGeneralSettings] = useState({
    businessName: "",
    timezone: ""
  });
  const [currentSettings, setCurrentSettings] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Load current settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const settings = await response.json();
          setCurrentSettings(settings);
          setGeneralSettings({
            businessName: settings.businessName || "",
            timezone: settings.timezone || ""
          });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleGeneralUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);

    try {
      const response = await fetch("/api/settings/general", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(generalSettings),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "General Settings Saved",
          description: "Your general settings have been updated successfully.",
        });
        
        // Update current settings to reflect changes
        setCurrentSettings((prev: any) => ({ ...prev, ...generalSettings }));
      } else {
        throw new Error(result.error || "Failed to save general settings");
      }
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
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappSettings),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "Your WhatsApp settings have been saved. To fully activate, please update your Replit Secrets with: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN",
        });
        
        // Clear the form for security
        setWhatsappSettings({
          token: "",
          phoneNumberId: "",
          verifyToken: ""
        });
      } else {
        throw new Error(result.error || "Failed to save settings");
      }
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">Manage your WhatsApp Pro configuration</p>
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

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGeneralUpdate} className="space-y-4">
                    <div>
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={generalSettings.businessName}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Enter your business name"
                        data-testid="input-business-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={generalSettings.timezone}
                        onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        placeholder="e.g., America/New_York, UTC, Asia/Kolkata"
                        data-testid="input-timezone"
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        disabled={isSavingGeneral}
                        data-testid="button-save-general"
                      >
                        {isSavingGeneral ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save mr-2"></i>
                            Save Changes
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