import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Gift, User, History, Bell } from "lucide-react";

interface NavigationProps {
  showBackButton?: boolean;
}

export default function Navigation({ showBackButton = false }: NavigationProps) {
  const [location] = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/rewards", label: "Rewards", icon: Gift },
    { path: "/history", label: "History", icon: History },
    { path: "/notifications", label: "Notifications", icon: Bell },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#3C3C3B] hover:bg-[#FDC800]/10"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          )}
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#FDC800] rounded-lg flex items-center justify-center">
              <span className="text-[#3C3C3B] font-bold text-sm">M</span>
            </div>
            <span className="font-bold text-[#3C3C3B] text-lg">Maverick</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button 
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={
                    isActive 
                      ? "bg-[#FDC800] text-[#3C3C3B] hover:bg-[#FDC800]/90" 
                      : "text-gray-600 hover:bg-gray-100"
                  }
                  data-testid={`nav-${item.path.replace('/', '')}`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* Mobile Navigation Menu Button */}
        <div className="md:hidden">
          <Button variant="ghost" size="sm" className="text-[#3C3C3B]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-1">
          {navItems.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <Button 
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={
                    isActive 
                      ? "bg-[#FDC800] text-[#3C3C3B] hover:bg-[#FDC800]/90 w-full flex-col h-12 p-1" 
                      : "text-gray-600 hover:bg-gray-100 w-full flex-col h-12 p-1"
                  }
                  data-testid={`mobile-nav-${item.path.replace('/', '')}`}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="text-xs leading-tight">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}