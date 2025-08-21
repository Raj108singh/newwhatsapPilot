import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  MessageSquare, Send, Users, Settings, Home, FileText as Template, 
  BarChart3, Bot, MessageCircle, LogOut, User, Shield 
} from "lucide-react";
import { useLogout, useAuthStatus } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Live Chat", href: "/conversations", icon: MessageCircle },
  { name: "Bulk Messages", href: "/bulk-message", icon: Send },
  { name: "Auto Reply", href: "/auto-reply", icon: Bot },
  { name: "Templates", href: "/templates", icon: Template },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Groups", href: "/groups", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function SidebarModern() {
  const [location] = useLocation();
  const { user } = useAuthStatus();
  const logoutMutation = useLogout();

  // Load branding settings with shorter cache time for instant updates
  const { data: brandingSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings'),
    staleTime: 30 * 1000, // 30 seconds for instant updates
    refetchOnWindowFocus: true,
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="w-64 shadow-sm border-r flex flex-col" style={{ 
      backgroundColor: 'var(--theme-sidebar-bg)', 
      borderColor: 'var(--theme-border)',
      color: 'var(--theme-sidebar-text)'
    }}>
      {/* Logo Header */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--theme-border)' }}>
        <div className="flex items-center space-x-3">
          {brandingSettings?.sidebar_logo ? (
            <img 
              src={brandingSettings.sidebar_logo} 
              alt="Logo" 
              className="w-12 h-12 object-contain rounded-lg shadow-sm"
              onError={(e) => {
                // Fallback to default icon if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-lg ${brandingSettings?.sidebar_logo ? 'hidden' : ''}`} style={{ 
            background: 'linear-gradient(135deg, var(--theme-primary-accent), var(--theme-secondary-accent))'
          }}>
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-medium truncate" style={{ color: 'var(--theme-sidebar-text)' }}>
            {brandingSettings?.app_title || 'WhatsApp Pro'}
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors"
              )}
              style={{
                backgroundColor: isActive ? 'var(--theme-primary-accent)' : 'transparent',
                color: isActive ? 'var(--theme-button-primary-text)' : 'var(--theme-sidebar-text)',
                border: isActive ? '1px solid var(--theme-primary-accent)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--theme-sidebar-hover-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-5 h-5" style={{ color: isActive ? 'var(--theme-button-primary-text)' : 'var(--theme-sidebar-icon)' }} />
              <span>{item.name}</span>
              
              {item.name === "Auto Reply" && (
                <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-800 text-xs">
                  AI
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator className="mx-4" />

      {/* User Profile & Logout */}
      <div className="p-4 space-y-4">
        {user && (
          <div className="flex items-center space-x-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--theme-sidebar-hover-bg)' }}>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-white text-sm" style={{ backgroundColor: 'var(--theme-primary-accent)' }}>
                {getUserInitials(user.name || user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--theme-sidebar-text)' }}>
                {user.name || user.username}
              </p>
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3" style={{ color: 'var(--theme-sidebar-icon)' }} />
                <p className="text-xs capitalize" style={{ color: 'var(--theme-sidebar-icon)' }}>
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </div>
  );
}