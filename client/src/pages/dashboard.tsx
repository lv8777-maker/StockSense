import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useResponsive } from "@/hooks/useResponsive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import TierProgressCard from "@/components/TierProgressCard";
import TransactionSimulator from "@/components/TransactionSimulator";
import MobileOptimizedDashboard from "@/components/MobileOptimizedDashboard";
import { tierDisplayNames, tierColors } from "@/utils/tierMapping";
import { 
  Coins, 
  Gift, 
  TrendingUp, 
  Clock, 
  Star,
  ShoppingCart,
  Award,
  Calendar,
  Crown,
  AlertTriangle,
  X
} from "lucide-react";

interface DashboardStats {
  totalPoints: number;
  pointsThisMonth: number;
  totalTransactions: number;
  recentRedemptions: number;
  currentTier: string;
  nextTier?: string;
  pointsToNext?: number;
  tierProgress?: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  points: number;
  date: string;
  status: string;
}

interface PointsExpiryInfo {
  expiryDate: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
  pointsAtRisk: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const [expiryBannerDismissed, setExpiryBannerDismissed] = useState(false);

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: expiryInfo } = useQuery<PointsExpiryInfo>({
    queryKey: ["/api/points/expiry"],
    staleTime: 5 * 60 * 1000, // cache for 5 min
  });

  const { data: recentActivity = [] } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  const { data: personalizedOffers = [] } = useQuery({
    queryKey: ["/api/offers/personalized"],
  });

  const { data: featuredRewards = [] } = useQuery({
    queryKey: ["/api/rewards", { featured: true }],
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  const currentPoints = user.totalPoints || 0;
  const currentTier = user.membershipTier || 'starter';

  // Calculate tier progress for Maverick system
  const tierRequirements = { starter: 0, explorer: 500, champion: 1500, elite: 3000 };
  const tiers = ['starter', 'explorer', 'champion', 'elite'];
  const currentIndex = tiers.indexOf(currentTier);
  const nextTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  
  let pointsToNext = 0;
  let tierProgress = 100;
  
  if (nextTier) {
    const nextRequirement = tierRequirements[nextTier as keyof typeof tierRequirements];
    const currentRequirement = tierRequirements[currentTier as keyof typeof tierRequirements];
    pointsToNext = nextRequirement - currentPoints;
    tierProgress = ((currentPoints - currentRequirement) / (nextRequirement - currentRequirement)) * 100;
  }

  // Show mobile-optimized dashboard on small screens
  if (isMobile) {
    return (
      <>
        <Navbar />
        <MobileOptimizedDashboard />
      </>
    );
  }

  const showExpiryWarning = !expiryBannerDismissed && expiryInfo && expiryInfo.expiryDate && (expiryInfo.daysRemaining !== null && expiryInfo.daysRemaining <= 30) && (expiryInfo.pointsAtRisk > 0);
  const isUrgent = expiryInfo && expiryInfo.daysRemaining !== null && expiryInfo.daysRemaining <= 7;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

      {/* Points Expiry Warning Banner */}
      {showExpiryWarning && (
        <div className={`rounded-lg p-4 flex items-start gap-3 ${isUrgent ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
          <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-sm ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
              {isUrgent ? 'Your points expire very soon!' : 'Your points are expiring soon'}
            </p>
            <p className={`text-sm mt-0.5 ${isUrgent ? 'text-red-700' : 'text-amber-700'}`}>
              <span className="font-medium">{expiryInfo!.pointsAtRisk.toLocaleString()} points</span> will expire in{' '}
              <span className="font-medium">{expiryInfo!.daysRemaining} {expiryInfo!.daysRemaining === 1 ? 'day' : 'days'}</span> on{' '}
              {new Date(expiryInfo!.expiryDate!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}.
              {' '}Earn or redeem points before then to keep them active.
            </p>
          </div>
          <button onClick={() => setExpiryBannerDismissed(true)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#3C3C3B] to-gray-800 text-white rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" data-testid="welcome-header">
              Welcome back, {user.firstName || 'Valued Customer'}!
            </h1>
            <p className="text-gray-300 text-sm sm:text-base">
              Ready to explore rewards and earn more points today?
            </p>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-2xl sm:text-3xl font-bold text-[#FDC800]" data-testid="total-points">
              {currentPoints.toLocaleString()}
            </div>
            <div className="text-sm text-gray-300">Total Points</div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="p-2 bg-[#FDC800]/20 rounded-lg w-fit">
                <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-[#FDC800]" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-[#3C3C3B]">
                  {stats?.pointsThisMonth || 0}
                </p>
                <p className="text-xs text-gray-600 truncate">Points This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#3C3C3B]">
                  {stats?.totalTransactions || 0}
                </p>
                <p className="text-xs text-gray-600">Total Purchases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gift className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#3C3C3B]">
                  {stats?.recentRedemptions || 0}
                </p>
                <p className="text-xs text-gray-600">Rewards Claimed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#3C3C3B]">
                  {tierDisplayNames[currentTier as keyof typeof tierDisplayNames] || 'Maverick Starter'}
                </p>
                <p className="text-xs text-gray-600">Current Tier</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Tier Progress & Transaction Simulator */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <TierProgressCard
            currentTier={currentTier}
            currentPoints={currentPoints}
            nextTier={nextTier || undefined}
            pointsToNext={pointsToNext}
            progress={tierProgress}
          />
          <div className="block lg:hidden">
            <TransactionSimulator currentPoints={currentPoints} />
          </div>
        </div>

        {/* Middle Column - Recent Activity */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-[#3C3C3B]">
                <Clock className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#3C3C3B]">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={activity.points > 0 ? "default" : "secondary"}>
                          {activity.points > 0 ? '+' : ''}{activity.points} pts
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs">Start shopping to see your activity here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Personalized Offers */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-[#3C3C3B]">
                <Star className="h-5 w-5 text-[#FDC800]" />
                <span>Just For You</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {personalizedOffers.length > 0 ? (
                  personalizedOffers.slice(0, 3).map((offer: any) => (
                    <div key={offer.id} className="p-3 bg-gradient-to-r from-[#FDC800]/10 to-yellow-50 rounded-lg border">
                      <h4 className="font-semibold text-sm text-[#3C3C3B]">
                        {offer.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {offer.description}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <Badge className="bg-[#FDC800] text-[#3C3C3B]">
                          {offer.value}
                        </Badge>
                        <Button size="sm" variant="outline" className="text-xs">
                          Use Offer
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Award className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No offers available</p>
                    <p className="text-xs">Check back soon for personalized deals</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Featured Rewards Section */}
      {featuredRewards.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-[#3C3C3B]">
                <Gift className="h-5 w-5" />
                <span>Featured Rewards</span>
              </CardTitle>
              <Button variant="outline" size="sm">
                View All Rewards
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {featuredRewards.slice(0, 3).map((reward: any) => (
                <div key={reward.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gray-200 rounded-lg mb-3 flex items-center justify-center">
                    <Gift className="h-8 w-8 text-gray-400" />
                  </div>
                  <h4 className="font-semibold text-[#3C3C3B] mb-1">
                    {reward.name}
                  </h4>
                  <p className="text-xs text-gray-600 mb-3">
                    {reward.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary">
                      {reward.pointsCost} points
                    </Badge>
                    <Button 
                      size="sm" 
                      className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                      disabled={currentPoints < reward.pointsCost}
                    >
                      {currentPoints >= reward.pointsCost ? 'Claim' : 'Need More Points'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  );
}