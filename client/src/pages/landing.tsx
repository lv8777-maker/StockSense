import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Star, Users, Award, Smartphone, Mail, Crown } from "lucide-react";
import PhoneLogin from "@/components/PhoneLogin";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function Landing() {
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-[#FDC800] rounded-lg flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-[#3C3C3B]" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-[#3C3C3B]">Maverick</h1>
                <span className="text-xs text-gray-500">Loyalty Program</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link href="/email-auth">
                <Button 
                  className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold"
                  data-testid="button-email-login"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Login
                </Button>
              </Link>
              <Button 
                onClick={() => setShowPhoneLogin(true)}
                variant="outline"
                data-testid="button-phone-login"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Phone Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your <span className="text-[#FDC800]">Maverick Experience</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Join Maverick's 4-tier loyalty program and earn points with every telecom plan. Redeem amazing rewards,
              get personalized offers, and enjoy exclusive benefits designed for your tier.
            </p>
            
            {/* Tier Benefits Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Crown className="h-6 w-6 mx-auto mb-2 text-[#8B4513]" />
                <p className="text-sm font-medium text-gray-900">Maverick Starter</p>
                <p className="text-xs text-gray-500">100 pts</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Crown className="h-6 w-6 mx-auto mb-2 text-[#C0C0C0]" />
                <p className="text-sm font-medium text-gray-900">Maverick Explorer</p>
                <p className="text-xs text-gray-500">200 pts</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Crown className="h-6 w-6 mx-auto mb-2 text-[#FFD700]" />
                <p className="text-sm font-medium text-gray-900">Maverick Champion</p>
                <p className="text-xs text-gray-500">300 pts</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                <Crown className="h-6 w-6 mx-auto mb-2 text-[#E5E4E2]" />
                <p className="text-sm font-medium text-gray-900">Maverick Elite</p>
                <p className="text-xs text-gray-500">500 pts</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/email-auth">
                <Button 
                  size="lg"
                  className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] text-lg px-8 py-3 font-semibold"
                  data-testid="button-email-signup"
                >
                  <Mail className="h-5 w-5 mr-2" />
                  Sign Up with Email & Plan
                </Button>
              </Link>
              
              <Button 
                onClick={() => setShowPhoneLogin(true)}
                size="lg"
                variant="outline"
                className="text-lg px-8 py-3"
                data-testid="button-phone-signup"
              >
                <Smartphone className="h-5 w-5 mr-2" />
                Continue with Phone (SA)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Maverick Loyalty?</h2>
            <p className="text-lg text-gray-600">Discover the benefits of our 4-tier telecom loyalty program</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="bg-[#FDC800]/10 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Gift className="h-8 w-8 text-[#3C3C3B]" />
                </div>
                <CardTitle className="text-lg">Plan-Based Points</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Earn tier-specific points when you select your telecom plan and upgrade for bonus rewards.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-[#FDC800]/10 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Crown className="h-8 w-8 text-[#3C3C3B]" />
                </div>
                <CardTitle className="text-lg">4 Loyalty Tiers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Progress through Starter, Explorer, Champion, and Elite tiers with increasing benefits.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-[#FDC800]/10 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Star className="h-8 w-8 text-[#3C3C3B]" />
                </div>
                <CardTitle className="text-lg">Premium Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Redeem points for telecom benefits, device upgrades, and exclusive Maverick experiences.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-[#FDC800]/10 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Award className="h-8 w-8 text-[#3C3C3B]" />
                </div>
                <CardTitle className="text-lg">Plan Upgrades</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Upgrade your plan anytime to earn bonus points and unlock higher tier benefits instantly.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-[#3C3C3B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Join Maverick Loyalty?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Choose your authentication method and start earning tier-based rewards today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/email-auth">
              <Button 
                size="lg"
                className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] text-lg px-8 py-3 font-semibold"
                data-testid="button-cta-email"
              >
                <Mail className="h-5 w-5 mr-2" />
                Start with Email & Plan Selection
              </Button>
            </Link>
            <Button 
              onClick={() => setShowPhoneLogin(true)}
              size="lg"
              variant="secondary"
              className="bg-white text-[#3C3C3B] hover:bg-gray-100 text-lg px-8 py-3"
              data-testid="button-cta-phone"
            >
              <Smartphone className="h-5 w-5 mr-2" />
              Continue with Phone (SA)
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Maverick Loyalty</h3>
            <p className="text-gray-400">
              Advanced loyalty programs for telecom excellence.
            </p>
          </div>
        </div>
      </footer>

      {/* Phone Login Modal */}
      {showPhoneLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-[#3C3C3B]">Phone Authentication</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowPhoneLogin(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <PhoneLogin onLoginSuccess={() => setShowPhoneLogin(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
