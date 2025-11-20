import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { availablePlans, getTierFromPlan } from "@/utils/tierMapping";
import { Phone, User, Smartphone, UserMinus, AlertTriangle } from "lucide-react";

interface PhoneLoginProps {
  onLoginSuccess: () => void;
}

export default function PhoneLogin({ onLoginSuccess }: PhoneLoginProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [showDeregister, setShowDeregister] = useState(false);
  const [deregisterPhone, setDeregisterPhone] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; firstName?: string; lastName?: string; currentPlan?: string }) => {
      const response = await apiRequest("POST", "/api/auth/phone", data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        const planInfo = currentPlan ? getTierFromPlan(currentPlan) : null;
        toast({
          title: "Welcome to Maverick Loyalty!",
          description: planInfo 
            ? `Successfully signed in! You've been assigned to ${planInfo.displayName} tier and earned ${planInfo.points} points!`
            : `Successfully signed in with ${data.user.phoneNumber}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        onLoginSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Sign In Failed", 
        description: error.message || "Please check your phone number and try again",
        variant: "destructive",
      });
    },
  });

  const deregisterMutation = useMutation({
    mutationFn: async (phoneToDeregister: string) => {
      // First try to authenticate with the phone number to verify ownership
      const authResponse = await apiRequest("POST", "/api/auth/phone", { phoneNumber: phoneToDeregister });
      await authResponse.json();
      
      // If authenticated successfully, proceed with deregistration
      const response = await apiRequest("DELETE", "/api/user/phone");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Phone Number Deregistered",
        description: "Your phone number has been successfully removed from our system.",
      });
      setShowDeregister(false);
      setDeregisterPhone("");
    },
    onError: (error: any) => {
      toast({
        title: "Deregistration Failed",
        description: error.message || "Unable to deregister phone number. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format for South African numbers
    if (digits.startsWith('27')) {
      // +27 XX XXX XXXX format
      const formatted = digits.replace(/^27(\d{2})(\d{3})(\d{4})$/, '+27 $1 $2 $3');
      return formatted.length === 15 ? formatted : `+${digits}`;
    } else if (digits.startsWith('0')) {
      // 0XX XXX XXXX format
      const formatted = digits.replace(/^0(\d{2})(\d{3})(\d{4})$/, '0$1 $2 $3');
      return formatted.length === 12 ? formatted : digits;
    } else if (digits.length === 9 && /^[678]/.test(digits)) {
      // XX XXX XXXX format (without leading 0)
      const formatted = digits.replace(/^(\d{2})(\d{3})(\d{4})$/, '$1 $2 $3');
      return formatted.length === 11 ? formatted : digits;
    }
    
    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your MTN phone number",
        variant: "destructive",
      });
      return;
    }

    const submitData: any = { phoneNumber };
    
    if (isNewUser) {
      if (!firstName.trim()) {
        toast({
          title: "First Name Required", 
          description: "Please enter your first name",
          variant: "destructive",
        });
        return;
      }
      if (!lastName.trim()) {
        toast({
          title: "Last Name Required", 
          description: "Please enter your last name",
          variant: "destructive",
        });
        return;
      }
      if (!currentPlan) {
        toast({
          title: "Plan Required",
          description: "Please select your current plan",
          variant: "destructive",
        });
        return;
      }
      submitData.firstName = firstName;
      submitData.lastName = lastName;
      submitData.currentPlan = currentPlan;
    }

    loginMutation.mutate(submitData);
  };

  const handleDeregister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deregisterPhone.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter the phone number you want to deregister",
        variant: "destructive",
      });
      return;
    }

    deregisterMutation.mutate(deregisterPhone);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3 sm:space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#FDC800] rounded-full flex items-center justify-center">
              <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-[#3C3C3B]" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-[#3C3C3B]">
              Maverick Loyalty
            </CardTitle>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Sign in with your South African mobile number
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                South African Mobile Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="072 123 4567 or +27 72 123 4567"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className="pl-10"
                  data-testid="input-phone-number"
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter your South African mobile number (06X, 07X, 08X)
              </p>
            </div>

            {isNewUser && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-10"
                      data-testid="input-first-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-10"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentPlan" className="text-sm font-medium">
                    Select Your Current Plan *
                  </Label>
                  <Select value={currentPlan} onValueChange={setCurrentPlan}>
                    <SelectTrigger data-testid="select-plan">
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
                  {currentPlan && (
                    <p className="text-xs text-green-600">
                      ✓ You'll earn {getTierFromPlan(currentPlan).points} points and join {getTierFromPlan(currentPlan).displayName} tier
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="newUser"
                checked={isNewUser}
                onChange={(e) => setIsNewUser(e.target.checked)}
                className="h-4 w-4 text-[#FDC800] focus:ring-[#FDC800] border-gray-300 rounded"
                data-testid="checkbox-new-user"
              />
              <Label htmlFor="newUser" className="text-sm">
                I'm a new customer
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold h-12 text-base"
              data-testid="button-sign-in"
            >
              {loginMutation.isPending ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-[#3C3C3B] border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Smartphone className="h-4 w-4" />
                  <span>{isNewUser ? "Create Account" : "Sign In"}</span>
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <p className="text-xs text-gray-500">
              By signing in, you agree to Maverick's terms of service and privacy policy.
              SMS charges may apply.
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDeregister(true)}
              className="text-xs text-gray-600 hover:text-red-600 p-0 h-auto font-normal"
              data-testid="button-deregister"
            >
              Need to deregister your phone number?
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deregister Modal */}
      <Dialog open={showDeregister} onOpenChange={setShowDeregister}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserMinus className="h-5 w-5 text-red-600" />
              <span>Deregister Phone Number</span>
            </DialogTitle>
            <DialogDescription>
              Remove your phone number from the Maverick loyalty system. This will delete your account and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleDeregister} className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Warning: This action cannot be undone</p>
                <p>Deregistering will permanently remove your account, points, and loyalty history.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deregisterPhone" className="text-sm font-medium">
                Enter your phone number to confirm
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="deregisterPhone"
                  type="tel"
                  placeholder="072 123 4567 or +27 72 123 4567"
                  value={deregisterPhone}
                  onChange={(e) => setDeregisterPhone(formatPhoneNumber(e.target.value))}
                  className="pl-10"
                  data-testid="input-deregister-phone"
                />
              </div>
            </div>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeregister(false)}
                className="flex-1"
                data-testid="button-cancel-deregister"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={deregisterMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-confirm-deregister"
              >
                {deregisterMutation.isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deregistering...</span>
                  </div>
                ) : (
                  "Deregister"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}