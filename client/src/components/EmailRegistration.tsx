import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { availablePlans, getTierFromPlan } from "@/utils/tierMapping";
import { Mail, Lock, User, Smartphone, Crown } from "lucide-react";

export default function EmailRegistration() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    currentPlan: undefined
  });
  const [isLogin, setIsLogin] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const authMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      return await apiRequest("POST", endpoint, data);
    },
    onSuccess: (data) => {
      toast({
        title: isLogin ? "Welcome back!" : "Account created successfully!",
        description: isLogin 
          ? "You've been logged in successfully." 
          : `Welcome to Maverick Loyalty! You've been assigned to ${getTierFromPlan(formData.currentPlan).displayName} tier and earned ${getTierFromPlan(formData.currentPlan).points} points!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect to dashboard after successful authentication
      setTimeout(() => {
        setLocation("/dashboard");
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!isLogin) {
      if (!formData.firstName) newErrors.firstName = "First name is required";
      if (!formData.lastName) newErrors.lastName = "Last name is required";
      if (!formData.currentPlan) newErrors.currentPlan = "Please select a plan";
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData = isLogin 
      ? { email: formData.email, password: formData.password }
      : {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          currentPlan: formData.currentPlan
        };

    authMutation.mutate(submitData);
  };

  const selectedPlanInfo = formData.currentPlan ? getTierFromPlan(formData.currentPlan) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FDC800] rounded-full flex items-center justify-center">
              <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-[#3C3C3B]" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-[#3C3C3B]">
              Maverick Loyalty
            </CardTitle>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              {isLogin ? "Sign in to your account" : "Create your loyalty account"}
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name *
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className={errors.firstName ? "border-red-500" : ""}
                    data-testid="input-first-name"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs">{errors.firstName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name *
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className={errors.lastName ? "border-red-500" : ""}
                    data-testid="input-last-name"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs">{errors.lastName}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className={errors.email ? "border-red-500" : ""}
                placeholder="example@domain.com"
                data-testid="input-email"
              />
              {errors.email && (
                <p className="text-red-500 text-xs">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password *
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className={errors.password ? "border-red-500" : ""}
                placeholder="At least 6 characters"
                data-testid="input-password"
              />
              {errors.password && (
                <p className="text-red-500 text-xs">{errors.password}</p>
              )}
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                    placeholder="Confirm your password"
                    data-testid="input-confirm-password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentPlan" className="text-sm font-medium">
                    Select Your Current Plan *
                  </Label>
                  <Select value={formData.currentPlan || ""} onValueChange={(value) => setFormData({...formData, currentPlan: value})}>
                    <SelectTrigger className={errors.currentPlan ? "border-red-500" : ""} data-testid="select-plan">
                      <SelectValue placeholder="Choose your plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlans.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          {plan.label} - {plan.tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.currentPlan && (
                    <p className="text-red-500 text-xs">{errors.currentPlan}</p>
                  )}
                </div>

                {/* Tier Preview */}
                {selectedPlanInfo && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[#3C3C3B]">{selectedPlanInfo.displayName}</span>
                      <span className="text-sm text-[#FDC800] font-semibold">+{selectedPlanInfo.points} points</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      You'll be assigned to this tier and receive {selectedPlanInfo.points} loyalty points to start!
                    </p>
                  </div>
                )}
              </>
            )}

            <Button
              type="submit"
              disabled={authMutation.isPending}
              className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold h-12 text-base"
              data-testid="button-auth"
            >
              {authMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-[#3C3C3B] border-t-transparent rounded-full animate-spin" />
                  <span>{isLogin ? "Signing In..." : "Creating Account..."}</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  {isLogin ? <Mail className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  <span>{isLogin ? "Sign In" : "Create Account"}</span>
                </div>
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-gray-600 hover:text-[#3C3C3B]"
                data-testid="button-toggle-mode"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </Button>
            </div>
          </form>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              By {isLogin ? "signing in" : "creating an account"}, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}