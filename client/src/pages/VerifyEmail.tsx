import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Crown, ShieldCheck } from "lucide-react";

export default function VerifyEmail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async (codeValue: string) => {
      const res = await apiRequest("POST", "/api/auth/verify-email", { code: codeValue });
      return await res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Verified!",
        description: "Your email and phone are confirmed. Welcome aboard.",
      });
      await queryClient.invalidateQueries();
      setLocation("/dashboard");
    },
    onError: (err: Error) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", {});
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "New code sent",
        description: data?.message || "Check your email for a fresh 6-digit code.",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't resend", description: err.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => await apiRequest("POST", "/api/auth/logout", {}),
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.trim();
    if (!/^\d{6}$/.test(cleaned)) {
      toast({
        title: "Enter the 6-digit code",
        description: "Your code is six digits long.",
        variant: "destructive",
      });
      return;
    }
    verifyMutation.mutate(cleaned);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-[#FDC800] rounded-full flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-[#3C3C3B]" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-[#3C3C3B]">
            Verify your account
          </CardTitle>
          <p className="text-sm text-gray-600 px-4">
            We sent a 6-digit code to{" "}
            <span className="font-semibold text-[#3C3C3B]">{user?.email || "your email"}</span>.
            Entering it confirms both your email and phone number{user?.phoneNumber ? ` (${user.phoneNumber})` : ""}.
          </p>
        </CardHeader>

        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-sm font-medium">Verification code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                data-testid="input-verification-code"
              />
            </div>

            <Button
              type="submit"
              disabled={verifyMutation.isPending}
              className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold h-12"
              data-testid="button-verify"
            >
              {verifyMutation.isPending ? "Verifying..." : "Verify and continue"}
            </Button>

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={resendMutation.isPending}
                onClick={() => resendMutation.mutate()}
                className="text-sm text-[#3C3C3B]"
                data-testid="button-resend"
              >
                <Mail className="h-4 w-4 mr-1" />
                {resendMutation.isPending ? "Sending..." : "Resend code"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="text-sm text-gray-500"
                data-testid="button-signout"
              >
                Sign out
              </Button>
            </div>
          </form>

          <p className="mt-6 text-xs text-center text-gray-500">
            Code expires in 15 minutes. Didn't get it? Check your spam folder or request a new one.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
