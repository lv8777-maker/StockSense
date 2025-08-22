import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Star, Users, Award, Smartphone } from "lucide-react";
import PhoneLogin from "@/components/PhoneLogin";
import { useQueryClient } from "@tanstack/react-query";

export default function Landing() {
  const [showLogin, setShowLogin] = useState(false);
  const queryClient = useQueryClient();

  const handleLoginSuccess = () => {
    setShowLogin(false);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    window.location.reload(); // Refresh to load authenticated app
  };

  if (showLogin) {
    return <PhoneLogin onLoginSuccess={handleLoginSuccess} />;
  }

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
            <Button 
              onClick={() => setShowLogin(true)}
              className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold"
              data-testid="button-login"
            >
              <Smartphone className="h-4 w-4 mr-2" />
              Sign In with Phone
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your <span className="text-[#FDC800]">Loyalty Experience</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Join Maverick's loyalty program and earn points with every purchase. Redeem amazing rewards,
              get personalized offers, and enjoy exclusive benefits designed just for you.
            </p>
            <p className="text-lg text-[#3C3C3B] font-semibold mb-8">
              🇿🇦 Sign in with your South African mobile number - No passwords required!
            </p>
            <Button 
              onClick={() => setShowLogin(true)}
              size="lg"
              className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] text-lg px-8 py-3 font-semibold"
              data-testid="button-get-started"
            >
              <Smartphone className="h-5 w-5 mr-2" />
              Get Started Today
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Maverick?</h2>
            <p className="text-lg text-gray-600">Discover the benefits of our modern loyalty program</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="bg-primary bg-opacity-10 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Gift className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-lg">Earn Points</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Earn points with every purchase and get bonus points for social media connections.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-accent bg-opacity-10 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Star className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-lg">Amazing Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Redeem your points for exclusive merchandise, discounts, and unique experiences.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-success bg-opacity-10 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Users className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="text-lg">Personalized Offers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Get tailored offers and recommendations based on your preferences and history.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-maverick-bright-yellow bg-opacity-20 p-3 rounded-lg w-fit mx-auto mb-4">
                  <Award className="h-8 w-8 text-maverick-dark-gray" />
                </div>
                <CardTitle className="text-lg">VIP Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Unlock exclusive tiers and benefits as you build your loyalty with us.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Earning Rewards?
          </h2>
          <p className="text-xl text-gray-100 mb-8">
            Join thousands of satisfied customers who are already enjoying the benefits.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            size="lg"
            variant="secondary"
            className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-3"
            data-testid="button-join-now"
          >
            Join Maverick Now
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">CustomerConnect</h3>
            <p className="text-gray-400">
              Modern loyalty programs for the digital age.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
