import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: "fas fa-chart-pie" },
  { name: "Bulk Messages", href: "/bulk-message", icon: "fas fa-paper-plane" },
  { name: "Live Chat", href: "/chat", icon: "fas fa-comments" },
  { name: "Templates", href: "/templates", icon: "fas fa-file-alt" },
  { name: "Contacts", href: "/contacts", icon: "fas fa-address-book" },
  { name: "Analytics", href: "/analytics", icon: "fas fa-chart-bar" },
  { name: "Settings", href: "/settings", icon: "fas fa-cog" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [user] = useState({
    name: "John Doe",
    email: "john@company.com"
  });

  return (
    <div className="w-64 bg-white shadow-sm border-r border-slate-200 flex flex-col">
      {/* Logo Header */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <i className="fab fa-whatsapp text-white text-lg"></i>
          </div>
          <span className="text-xl font-semibold text-slate-900">WhatsApp Pro</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-slate-100"
              )}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <i className={`${item.icon} w-5`}></i>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
            <i className="fas fa-user text-slate-600"></i>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button 
            className="text-slate-400 hover:text-slate-600"
            data-testid="button-logout"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
