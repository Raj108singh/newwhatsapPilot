import { Switch, Route } from "wouter";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthWrapper from "@/components/auth-wrapper";
import SidebarModern from "@/components/sidebar-modern";
import Dashboard from "@/pages/dashboard";
import BulkMessage from "@/pages/bulk-message";
import Chat from "@/pages/chat";
import Templates from "@/pages/templates";
import Analytics from "@/pages/analytics";
import Contacts from "@/pages/contacts";
import Groups from "@/pages/groups";
import Settings from "@/pages/settings";
import ConversationsPage from "@/pages/conversations";
import AutoReplyPage from "@/pages/auto-reply";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

function AppLayout() {
  // Load branding settings for footer text with instant updates
  const { data: brandingSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings'),
    staleTime: 30 * 1000, // 30 seconds for instant updates
    refetchOnWindowFocus: true,
  });

  // Apply theme colors on app load
  useEffect(() => {
    if (brandingSettings) {
      const applyThemeToDocument = (settings: any) => {
        const root = document.documentElement;
        
        // Apply theme variables to CSS custom properties
        root.style.setProperty('--theme-primary-bg', settings.primary_bg_color || '#ffffff');
        root.style.setProperty('--theme-secondary-bg', settings.secondary_bg_color || '#f8fafc');
        root.style.setProperty('--theme-sidebar-bg', settings.sidebar_bg_color || '#ffffff');
        root.style.setProperty('--theme-card-bg', settings.card_bg_color || '#ffffff');
        root.style.setProperty('--theme-primary-text', settings.primary_text_color || '#1f2937');
        root.style.setProperty('--theme-secondary-text', settings.secondary_text_color || '#6b7280');
        root.style.setProperty('--theme-heading-text', settings.heading_text_color || '#111827');
        root.style.setProperty('--theme-sidebar-text', settings.sidebar_text_color || '#1f2937');
        root.style.setProperty('--theme-sidebar-icon', settings.sidebar_icon_color || '#6b7280');
        root.style.setProperty('--theme-sidebar-hover-bg', settings.sidebar_hover_bg || '#f3f4f6');
        root.style.setProperty('--theme-primary-accent', settings.primary_accent_color || '#3b82f6');
        root.style.setProperty('--theme-secondary-accent', settings.secondary_accent_color || '#6366f1');
        root.style.setProperty('--theme-success', settings.success_color || '#10b981');
        root.style.setProperty('--theme-warning', settings.warning_color || '#f59e0b');
        root.style.setProperty('--theme-error', settings.error_color || '#ef4444');
        root.style.setProperty('--theme-border', settings.border_color || '#e5e7eb');
        root.style.setProperty('--theme-shadow', settings.shadow_color || '#00000010');
        root.style.setProperty('--theme-button-primary-bg', settings.button_primary_bg || '#3b82f6');
        root.style.setProperty('--theme-button-primary-text', settings.button_primary_text || '#ffffff');
        root.style.setProperty('--theme-button-secondary-bg', settings.button_secondary_bg || '#f3f4f6');
        root.style.setProperty('--theme-button-secondary-text', settings.button_secondary_text || '#374151');

        // Also update main background and text colors for immediate visual effect
        root.style.setProperty('--background', settings.primary_bg_color || '#ffffff');
        root.style.setProperty('--foreground', settings.primary_text_color || '#1f2937');
        root.style.setProperty('--card', settings.card_bg_color || '#ffffff');
        root.style.setProperty('--card-foreground', settings.primary_text_color || '#1f2937');
        root.style.setProperty('--sidebar', settings.sidebar_bg_color || '#ffffff');
        root.style.setProperty('--sidebar-foreground', settings.sidebar_text_color || '#1f2937');
        root.style.setProperty('--primary', settings.primary_accent_color || '#3b82f6');
        root.style.setProperty('--border', settings.border_color || '#e5e7eb');
      };

      applyThemeToDocument(brandingSettings);
    }
  }, [brandingSettings]);

  return (
    <div className="flex h-screen flex-col" style={{ backgroundColor: 'var(--theme-secondary-bg)' }}>
      <div className="flex flex-1 overflow-hidden">
        <SidebarModern />
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/bulk-message" component={BulkMessage} />
          <Route path="/conversations" component={ConversationsPage} />
          <Route path="/auto-reply" component={AutoReplyPage} />
          <Route path="/chat" component={Chat} />
          <Route path="/templates" component={Templates} />
          <Route path="/contacts" component={Contacts} />
          <Route path="/groups" component={Groups} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </div>
      {/* Footer */}
      <footer className="border-t px-6 py-3" style={{ 
        backgroundColor: 'var(--theme-card-bg)', 
        borderColor: 'var(--theme-border)', 
        color: 'var(--theme-secondary-text)' 
      }}>
        <div className="text-center text-sm">
          {brandingSettings?.footer_text || 'Powered by WhatsApp Pro'}
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthWrapper>
          <AppLayout />
        </AuthWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
