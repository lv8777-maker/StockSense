import { Switch, Route } from "wouter";
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
import Notifications from "@/pages/notifications";
import NotFound from "@/pages/not-found";
import EmailRegistration from "@/components/EmailRegistration";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/email-auth" component={EmailRegistration} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/rewards" component={Rewards} />
          <Route path="/history" component={History} />
          <Route path="/profile" component={Profile} />
          <Route path="/campaigns" component={Campaigns} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/admin" component={Admin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
