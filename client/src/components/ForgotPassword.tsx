import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Crown, ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const forgotMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      return res;
    },
    onSuccess: (data: any) => {
      setSubmitted(true);
      if (data?.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Something went wrong",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    if (!email) {
      setEmailError("Email address is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    forgotMutation.mutate(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-[#FDC800] rounded-full flex items-center justify-center">
              <Crown className="h-7 w-7 text-[#3C3C3B]" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-[#3C3C3B]">
              {submitted ? "Check Your Email" : "Forgot Password?"}
            </CardTitle>
            <p className="text-gray-500 mt-2 text-sm">
              {submitted
                ? "We've sent password reset instructions to your email."
                : "Enter your email and we'll send you a link to reset your password."}
            </p>
          </div>
        </CardHeader>

        <CardContent className="px-6">
          {submitted ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle className="h-14 w-14 text-green-500" />
                <p className="text-center text-sm text-gray-600">
                  If <span className="font-medium text-[#3C3C3B]">{email}</span> is linked to a Maverick Loyalty account, you'll receive a reset link shortly.
                </p>
              </div>

              {devResetUrl && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-yellow-800">Development Mode — Reset Link:</p>
                  <a
                    href={devResetUrl}
                    className="text-xs text-blue-600 underline break-all"
                  >
                    {devResetUrl}
                  </a>
                  <p className="text-xs text-yellow-700">This link is shown here because no email service is configured. In production, it would be emailed to the user.</p>
                </div>
              )}

              <Button
                onClick={() => setLocation("/email-auth")}
                className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold h-11"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className={emailError ? "border-red-500" : ""}
                  autoFocus
                />
                {emailError && (
                  <p className="text-red-500 text-xs">{emailError}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={forgotMutation.isPending}
                className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold h-11"
              >
                {forgotMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#3C3C3B] border-t-transparent rounded-full animate-spin" />
                    <span>Sending Reset Link...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Send Reset Link</span>
                  </div>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocation("/email-auth")}
                className="w-full text-sm text-gray-600 hover:text-[#3C3C3B] flex items-center gap-2 justify-center"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
