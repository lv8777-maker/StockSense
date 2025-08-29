import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TierProgressCard from "@/components/TierProgressCard";
import TransactionSimulator from "@/components/TransactionSimulator";
import { 
  Coins, 
  Gift, 
  TrendingUp, 
  Clock, 
  Star,
  ShoppingCart,
  Award,
  Calendar,
  ChevronRight
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

export default function MobileOptimizedDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentActivity = [] } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  const { data: featuredRewards = [] } = useQuery({
    queryKey: ["/api/rewards", { featured: true }],
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  const currentPoints = user.totalPoints || 0;
  const currentTier = user.membershipTier || 'bronze';

  // Calculate tier progress
  const tierRequirements = { bronze: 0, silver: 1000, gold: 5000, platinum: 15000 };
  const tiers = ['bronze', 'silver', 'gold', 'platinum'];
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-[#3C3C3B] to-gray-800 text-white p-4 rounded-b-xl">
        <div className="text-center">
          <h1 className="text-lg font-bold" data-testid="welcome-header">
            Hi, {user.firstName || 'Customer'}!
          </h1>
          <div className="mt-2">
            <div className="text-3xl font-bold text-[#FDC800]" data-testid="total-points">
              {currentPoints.toLocaleString()}
            </div>
            <div className="text-sm text-gray-300">Total Points</div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          <TabsTrigger value="rewards" className="text-xs">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-[#3C3C3B]">
                    {stats?.pointsThisMonth || 0}
                  </div>
                  <div className="text-xs text-gray-600">This Month</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="text-center">
                  <div className="text-lg font-bold text-[#3C3C3B] capitalize">
                    {currentTier}
                  </div>
                  <div className="text-xs text-gray-600">Current Tier</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tier Progress */}
          <TierProgressCard
            currentTier={currentTier}
            currentPoints={currentPoints}
            nextTier={nextTier || undefined}
            pointsToNext={pointsToNext}
            progress={tierProgress}
          />

          {/* Transaction Simulator */}
          <TransactionSimulator currentPoints={currentPoints} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-[#3C3C3B] text-base">
                <Clock className="h-4 w-4" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#3C3C3B] truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={activity.points > 0 ? "default" : "secondary"} className="ml-2">
                        {activity.points > 0 ? '+' : ''}{activity.points} pts
                      </Badge>
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
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4 mt-4">
          {featuredRewards.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-[#3C3C3B] text-base">
                    <Gift className="h-4 w-4" />
                    <span>Featured Rewards</span>
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {featuredRewards.slice(0, 4).map((reward: any) => (
                    <div key={reward.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Gift className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-[#3C3C3B] text-sm truncate">
                          {reward.name}
                        </h4>
                        <p className="text-xs text-gray-600 truncate">
                          {reward.pointsCost} points
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] text-xs px-3"
                        disabled={currentPoints < reward.pointsCost}
                      >
                        {currentPoints >= reward.pointsCost ? 'Claim' : 'Locked'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}