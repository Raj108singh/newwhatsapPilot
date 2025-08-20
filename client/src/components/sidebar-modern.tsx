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
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function SidebarModern() {
  const [location] = useLocation();
  const { user } = useAuthStatus();
  const logoutMutation = useLogout();

  // Load branding settings
  const { data: brandingSettings } = useQuery({
    queryKey: ['/api/settings'],
    queryFn: () => apiRequest('/api/settings'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-900 shadow-sm border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Logo Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {brandingSettings?.sidebar_logo ? (
            <img 
              src={brandingSettings.sidebar_logo} 
              alt="Logo" 
              className="w-8 h-8 object-contain"
              onError={(e) => {
                // Fallback to default icon if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center ${brandingSettings?.sidebar_logo ? 'hidden' : ''}`}>
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-semibold text-gray-900 dark:text-white">
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
                "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                isActive
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-5 h-5" />
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
          <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-blue-500 text-white text-sm">
                {getUserInitials(user.name || user.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name || user.username}
              </p>
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3 text-gray-500" />
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
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