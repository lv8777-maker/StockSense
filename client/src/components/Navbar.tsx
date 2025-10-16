import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();
  const { user } = useAuth();

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
    { path: "/notifications", label: "Notifications" },
    { path: "/history", label: "Purchase History" },
    { path: "/profile", label: "Profile" },
    { path: "/admin", label: "Admin Panel" },
  ];

  const isActive = (path: string) => location === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Navigation Links */}
          <div className="flex items-center space-x-8">
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

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900" data-testid="text-user-name">
                {user?.firstName || "User"} {user?.lastName || ""}
              </p>
              <p className="text-xs text-gray-500" data-testid="text-points-total">
                {user?.totalPoints?.toLocaleString() || 0} pts
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
        </div>
      </div>
    </nav>
  );
}
