import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Phone, User, Smartphone } from "lucide-react";

interface PhoneLoginProps {
  onLoginSuccess: () => void;
}

export default function PhoneLogin({ onLoginSuccess }: PhoneLoginProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; firstName?: string; lastName?: string }) => {
      return await apiRequest("/api/auth/phone", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Welcome to Maverick Loyalty!",
          description: `Successfully signed in with ${data.user.phoneNumber}`,
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
      submitData.firstName = firstName;
      submitData.lastName = lastName;
    }

    loginMutation.mutate(submitData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-[#FDC800] rounded-full flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-[#3C3C3B]" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-[#3C3C3B]">
              Maverick Loyalty
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Sign in with your South African mobile number
            </p>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                    Last Name (Optional)
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
              className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold"
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

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By signing in, you agree to Maverick's terms of service and privacy policy.
              SMS charges may apply.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}