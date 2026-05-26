import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Rewards from "@/pages/rewards";
import History from "@/pages/history";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import Campaigns from "@/pages/campaigns";
import SubmitPurchase from "@/pages/SubmitPurchase";
import UploadInvoice from "@/pages/UploadInvoice";
import VerifyEmail from "@/pages/VerifyEmail";
import NotFound from "@/pages/not-found";
import PrivacyPolicy from "@/pages/privacy";
import EmailRegistration from "@/components/EmailRegistration";
import ForgotPassword from "@/components/ForgotPassword";
import ResetPassword from "@/components/ResetPassword";
import LogoHeader from "@/components/LogoHeader";

function ProtectedAdminRoute() {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FDC800] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return <Admin />;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const needsVerification = isAuthenticated && user && (user as any).isVerified === false;

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/email-auth" component={EmailRegistration} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
        </>
      ) : needsVerification ? (
        <>
          <Route path="/verify-email" component={VerifyEmail} />
          <Route>{() => <Redirect to="/verify-email" />}</Route>
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/rewards" component={Rewards} />
          <Route path="/submit-purchase" component={SubmitPurchase} />
          <Route path="/upload-invoice" component={UploadInvoice} />
          <Route path="/history" component={History} />
          <Route path="/profile" component={Profile} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/admin" component={ProtectedAdminRoute} />
        </>
      )}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <LogoHeader />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
