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
import Settings from "@/pages/settings";
import ConversationsPage from "@/pages/conversations";
import AutoReplyPage from "@/pages/auto-reply";
import NotFound from "@/pages/not-found";

function AppLayout() {
  // Load branding settings for footer text with instant updates
  const { data: brandingSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings'),
    staleTime: 30 * 1000, // 30 seconds for instant updates
    refetchOnWindowFocus: true,
  });

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-gray-900 flex-col">
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
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </div>
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
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
