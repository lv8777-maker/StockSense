import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, Menu, X, Coins } from "lucide-react";

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
    { path: "/dashboard", label: "Dashboard" },
    { path: "/rewards", label: "Rewards Catalog" },
    { path: "/submit-purchase", label: "Submit Receipt" },
    { path: "/campaigns", label: "Campaigns" },
    { path: "/history", label: "Purchase History" },
    { path: "/profile", label: "Profile" },
    { path: "/admin", label: "Admin Panel" },
  ];

  const isActive = (path: string) => location === path;

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand - Mobile */}
          <div className="flex items-center lg:hidden">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-[#FDC800] rounded-md flex items-center justify-center">
                <span className="text-[#3C3C3B] font-bold text-sm">M</span>
              </div>
              <span className="font-bold text-[#3C3C3B]">Maverick</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "text-gray-900 border-b-2 border-gray-900 pb-0.5"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                  data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {item.label}
                </a>
              </Link>
            ))}
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center space-x-3">
            {/* Points Display - Mobile & Desktop */}
            <div className="flex items-center space-x-2 bg-[#FDC800]/10 px-3 py-1.5 rounded-lg">
              <Coins className="h-4 w-4 text-[#FDC800]" />
              <span className="text-sm font-semibold text-[#3C3C3B]" data-testid="text-points-total">
                {user?.totalPoints?.toLocaleString() || 0}
              </span>
            </div>

            {/* Desktop User Info & Logout */}
            <div className="hidden lg:flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900" data-testid="text-user-name">
                  {user?.firstName || "User"} {user?.lastName || ""}
                </p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>

            {/* Mobile Menu Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button 
                  variant="ghost" 
                  className="min-h-[44px] min-w-[44px] p-2"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-6 w-6 text-gray-700" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#FDC800] rounded-lg flex items-center justify-center">
                        <span className="text-[#3C3C3B] font-bold">M</span>
                      </div>
                      <div>
                        <div className="text-base font-bold text-gray-900">
                          {user?.firstName || "User"} {user?.lastName || ""}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center space-x-1">
                          <Coins className="h-3 w-3 text-[#FDC800]" />
                          <span>{user?.totalPoints?.toLocaleString() || 0} points</span>
                        </div>
                      </div>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile Navigation Items */}
                <div className="mt-8 flex flex-col space-y-1">
                  {navigationItems.map((item) => (
                    <Link key={item.path} href={item.path}>
                      <a
                        onClick={handleNavClick}
                        className={`flex items-center min-h-[48px] px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                          isActive(item.path)
                            ? "bg-[#FDC800] text-[#3C3C3B]"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                        data-testid={`link-mobile-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {item.label}
                      </a>
                    </Link>
                  ))}
                </div>

                {/* Mobile Logout Button */}
                <div className="absolute bottom-6 left-6 right-6">
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full min-h-[48px] border-gray-300 text-gray-700 hover:bg-gray-100"
                    data-testid="button-mobile-logout"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
