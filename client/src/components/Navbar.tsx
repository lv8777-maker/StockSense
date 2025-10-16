import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Crown, 
  Home, 
  Gift, 
  Receipt, 
  History, 
  User, 
  Bell,
  Menu,
  X,
  LogOut
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navigationItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/rewards", label: "Rewards", icon: Gift },
    { path: "/submit-purchase", label: "Submit Receipt", icon: Receipt },
    { path: "/history", label: "History", icon: History },
    { path: "/notifications", label: "Notifications", icon: Bell },
    { path: "/profile", label: "Profile", icon: User },
  ];

  const isActive = (path: string) => location === path;

  return (
    <nav className="bg-[#3C3C3B] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard">
            <a className="flex items-center space-x-2 hover:opacity-80 transition-opacity" data-testid="link-home">
              <div className="w-10 h-10 bg-[#FDC800] rounded-full flex items-center justify-center">
                <Crown className="h-6 w-6 text-[#3C3C3B]" />
              </div>
              <span className="text-xl font-bold hidden sm:block">Maverick Loyalty</span>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <a
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? "bg-[#FDC800] text-[#3C3C3B]"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                    data-testid={`link-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </div>

          {/* User Info & Logout */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white" data-testid="text-username">
                {user?.firstName || "User"}
              </p>
              <p className="text-xs text-[#FDC800]">
                {user?.totalPoints?.toLocaleString() || 0} pts
              </p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-[#FDC800] text-[#FDC800] hover:bg-[#FDC800] hover:text-[#3C3C3B]"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" data-testid="button-mobile-menu">
                <Menu className="h-6 w-6 text-white" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-[#3C3C3B] text-white border-l border-gray-700">
              <SheetHeader>
                <SheetTitle className="text-white flex items-center space-x-2">
                  <Crown className="h-6 w-6 text-[#FDC800]" />
                  <span>Menu</span>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-1">
                {/* User Info */}
                <div className="px-3 py-4 bg-gray-800 rounded-lg mb-4">
                  <p className="text-sm font-medium text-white">
                    {user?.firstName || "User"}
                  </p>
                  <p className="text-xs text-[#FDC800]">
                    {user?.totalPoints?.toLocaleString() || 0} points
                  </p>
                </div>

                {/* Navigation Items */}
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.path} href={item.path}>
                      <a
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-3 rounded-md text-sm font-medium transition-colors ${
                          isActive(item.path)
                            ? "bg-[#FDC800] text-[#3C3C3B]"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </a>
                    </Link>
                  );
                })}

                {/* Logout Button */}
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full mt-4 border-[#FDC800] text-[#FDC800] hover:bg-[#FDC800] hover:text-[#3C3C3B]"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
