import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Gift, Coins, Award, ShoppingCart, AlertCircle, Coffee, Utensils, Clapperboard, ShoppingBasket, Fuel, Smartphone, Watch, Cpu, Sparkles, Compass } from "lucide-react";
import cappuccinoImg from "@assets/WhatsApp_Image_2026-03-31_at_16.00.51_1774997016360.jpeg";
import spaImg from "@assets/spa_wellness.jpeg";
import healthyLunchImg from "@assets/WhatsApp_Image_2026-03-31_at_16.00.49_1774997498331.jpeg";
import airtimeImg from "@assets/WhatsApp_Image_2026-03-31_at_16.00.50_1774997586164.jpeg";
import accessoryImg from "@assets/accessory_reward.jpeg";
import type { Reward } from "@shared/schema";
import Navbar from "@/components/Navbar";

export default function Rewards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  const { data: rewards = [], isLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardData: { rewardId: string; pointsSpent: number }) => {
      const response = await fetch("/api/redemptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rewardData),
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Redemption failed" }));
        throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: async () => {
      toast({
        title: "🎉 Reward Claimed Successfully!",
        description: "Your reward has been processed. Check your email for confirmation details.",
      });
      // Force immediate refetch of user data and dashboard stats
      try {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ["/api/auth/user"] }),
          queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] }),
        ]);
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/redemptions"] });
      setShowClaimDialog(false);
      setSelectedReward(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Claim Failed",
        description: error.message || "Unable to process your reward claim. Please try again.",
        variant: "destructive",
      });
    },
  });

  const categories = [
    { value: "all", label: "All" },
    { value: "food", label: "Food & Drinks" },
    { value: "merchandise", label: "Merchandise" },
    { value: "experiences", label: "Experiences" },
    { value: "discounts", label: "Airtime & Discounts" },
  ];

  const getRewardIcon = (name: string, category: string) => {
    const n = name.toLowerCase();
    if (n.includes("cappuccino") || n.includes("coffee")) return Coffee;
    if (n.includes("lunch") || n.includes("nando") || n.includes("kauai") || n.includes("restaurant") || n.includes("food") || n.includes("grocery") || n.includes("woolworth") || n.includes("checkers")) return Utensils;
    if (n.includes("movie") || n.includes("cinema") || n.includes("ticket")) return Clapperboard;
    if (n.includes("grocery") || n.includes("voucher") && category === "food") return ShoppingBasket;
    if (n.includes("fuel") || n.includes("petrol")) return Fuel;
    if (n.includes("airtime") || n.includes("data") || n.includes("mtn")) return Smartphone;
    if (n.includes("accessory") || n.includes("in-store")) return Watch;
    if (n.includes("gadget") || n.includes("powerbank") || n.includes("bluetooth") || n.includes("speaker")) return Cpu;
    if (n.includes("spa") || n.includes("wellness")) return Sparkles;
    if (n.includes("weekend") || n.includes("getaway") || n.includes("experience")) return Compass;
    if (category === "food") return Utensils;
    if (category === "merchandise") return Watch;
    if (category === "experiences") return Compass;
    if (category === "discounts") return Smartphone;
    return Gift;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "food": return "from-orange-400 to-orange-300";
      case "merchandise": return "from-blue-500 to-blue-400";
      case "experiences": return "from-purple-500 to-purple-400";
      case "discounts": return "from-green-500 to-green-400";
      default: return "from-[#FDC800] to-[#FDC800]/70";
    }
  };

  const getRewardImage = (name: string): string | null => {
    const n = name.toLowerCase();
    if (n.includes("cappuccino")) return cappuccinoImg;
    if (n.includes("spa") || n.includes("wellness")) return spaImg;
    if (n.includes("lunch") || n.includes("healthy")) return healthyLunchImg;
    if (n.includes("airtime") || n.includes("data")) return airtimeImg;
    if (n.includes("accessory") || n.includes("in-store")) return accessoryImg;
    return null;
  };

  const filteredRewards = selectedCategory === "all" 
    ? rewards.filter((reward: Reward) => reward.isActive)
    : rewards.filter((reward: Reward) => reward.category === selectedCategory && reward.isActive);

  const handleClaimClick = (reward: Reward) => {
    setSelectedReward(reward);
    setShowClaimDialog(true);
  };

  const confirmClaim = async () => {
    if (!selectedReward || !user) return;
    
    redeemMutation.mutate({
      rewardId: selectedReward.id,
      pointsSpent: selectedReward.pointsCost,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Maverick Rewards</h2>
            <p className="text-gray-600 text-sm sm:text-base">Redeem your points for exclusive Maverick rewards</p>
          </div>
          <div className="bg-[#FDC800] text-[#3C3C3B] px-3 sm:px-4 py-2 rounded-lg w-fit">
            <span className="text-sm font-medium" data-testid="text-available-points">
              Available: {user?.totalPoints || 0} points
            </span>
          </div>
        </div>

      {/* Filter Options */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-4 sm:items-center">
            <span className="text-sm font-medium text-gray-700">Filter by category:</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`text-sm min-h-[44px] px-4 ${selectedCategory === category.value ? "bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]" : ""}`}
                  data-testid={`button-filter-${category.value}`}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200" />
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded mb-4" />
                <div className="h-8 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRewards.length === 0 ? (
        <Card className="text-center p-12">
          <CardContent>
            <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Rewards Available</h3>
            <p className="text-gray-600 mb-4">
              {selectedCategory === "all" 
                ? "No rewards are currently available." 
                : `No ${categories.find(c => c.value === selectedCategory)?.label} rewards available.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRewards.map((reward: Reward) => {
            const Icon = getRewardIcon(reward.name, reward.category ?? "");
            const gradientClass = getCategoryColor(reward.category ?? "");
            const rewardImage = getRewardImage(reward.name);
            return (
            <Card key={reward.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {rewardImage ? (
                <div className="h-44 overflow-hidden">
                  <img
                    src={rewardImage}
                    alt={reward.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className={`h-44 bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                  <Icon className="h-16 w-16 text-white drop-shadow-sm" />
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 leading-snug pr-2" data-testid={`reward-title-${reward.id}`}>
                    {reward.name}
                  </h3>
                  <Badge className="bg-[#FDC800] text-[#3C3C3B] shrink-0" data-testid={`reward-category-${reward.id}`}>
                    {reward.category === "food" ? "Food & Drinks" :
                     reward.category === "merchandise" ? "Merchandise" :
                     reward.category === "experiences" ? "Experience" :
                     reward.category === "discounts" ? "Airtime / Data" :
                     reward.category}
                  </Badge>
                </div>
                
                <p className="text-gray-600 text-sm mb-4" data-testid={`reward-description-${reward.id}`}>
                  {reward.description}
                </p>
                
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <Coins className="h-4 w-4 text-[#FDC800]" />
                    <span className="font-bold text-[#3C3C3B]" data-testid={`reward-points-${reward.id}`}>
                      {reward.pointsCost} Points
                    </span>
                  </div>
                  
                  {reward.isActive && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      ✓ Available
                    </Badge>
                  )}
                </div>
                
                <Button
                  onClick={() => handleClaimClick(reward)}
                  disabled={!user || user.totalPoints < reward.pointsCost || !reward.isActive}
                  className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-medium"
                  data-testid={`button-claim-${reward.id}`}
                >
                  {!user ? "Sign In to Claim" :
                   user.totalPoints < reward.pointsCost ? `Need ${reward.pointsCost - user.totalPoints} More Points` :
                   !reward.isActive ? "Currently Unavailable" :
                   "Claim Reward"}
                </Button>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Claim Confirmation Dialog */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-[#FDC800]" />
              <span>Confirm Reward Claim</span>
            </DialogTitle>
            <DialogDescription>
              Review your reward claim details before confirming
            </DialogDescription>
          </DialogHeader>
          
          {selectedReward && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2" data-testid="claim-dialog-reward-name">
                  {selectedReward.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {selectedReward.description}
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Reward Cost:</span>
                    <span className="font-medium text-[#3C3C3B]" data-testid="claim-dialog-cost">
                      {selectedReward.pointsCost} Points
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Your Points:</span>
                    <span className="font-medium" data-testid="claim-dialog-current-points">
                      {user?.totalPoints || 0} Points
                    </span>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Remaining After Claim:</span>
                      <span className={`${(user?.totalPoints || 0) - selectedReward.pointsCost >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="claim-dialog-remaining">
                        {(user?.totalPoints || 0) - selectedReward.pointsCost} Points
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How Claiming Works:</p>
                    <ul className="text-xs space-y-1">
                      <li>• Points will be deducted immediately</li>
                      <li>• You'll receive confirmation via email</li>
                      <li>• Delivery/pickup instructions will be provided</li>
                      <li>• Digital rewards are activated instantly</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowClaimDialog(false)}
                  className="flex-1"
                  data-testid="button-cancel-claim"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmClaim}
                  disabled={redeemMutation.isPending || !user || user.totalPoints < selectedReward.pointsCost}
                  className="flex-1 bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B]"
                  data-testid="button-confirm-claim"
                >
                  {redeemMutation.isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-[#3C3C3B] border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Confirm Claim</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}