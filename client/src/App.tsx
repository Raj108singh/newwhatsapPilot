import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
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
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthWrapper>
          <div className="flex h-screen bg-slate-50 dark:bg-gray-900">
            <SidebarModern />
            <Router />
          </div>
        </AuthWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
