import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import RewardCard from "@/components/RewardCard";
import type { Reward } from "@shared/schema";

export default function Rewards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: rewards = [], isLoading } = useQuery<Reward[]>({
    queryKey: ["/api/rewards"],
  });

  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  const redeemMutation = useMutation({
    mutationFn: async (rewardData: { rewardId: string; pointsSpent: number }) => {
      return await apiRequest("/api/redemptions", {
        method: "POST",
        body: JSON.stringify(rewardData),
      });
    },
    onSuccess: () => {
      toast({
        title: "🎉 Reward Claimed Successfully!",
        description: "Your reward has been processed. Check your email for confirmation details.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
    { value: "discounts", label: "Discounts" },
  ];

  const filteredRewards = selectedCategory === "all" 
    ? rewards.filter((reward: Reward) => reward.isActive)
    : rewards.filter((reward: Reward) => reward.category === selectedCategory && reward.isActive);

  const handleClaimClick = (reward: Reward) => {
    setSelectedReward(reward);
    setShowClaimDialog(true);
  };

  const confirmClaim = () => {
    if (!selectedReward || !user) return;

    if (user.totalPoints < selectedReward.pointsCost) {
      toast({
        title: "Insufficient Points",
        description: `You need ${selectedReward.pointsCost} points to claim this reward. You have ${user.totalPoints} points.`,
        variant: "destructive",
      });
      return;
    }

    redeemMutation.mutate({
      rewardId: selectedReward.id,
      pointsSpent: selectedReward.pointsCost,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Maverick Rewards</h2>
          <p className="text-gray-600">Redeem your points for exclusive Maverick rewards</p>
        </div>
        <div className="bg-primary text-white px-4 py-2 rounded-lg">
          <span className="text-sm font-medium" data-testid="text-available-points">
            Available: {user?.totalPoints || 0} points
          </span>
        </div>
      </div>

      {/* Filter Options */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">Filter by category:</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.value)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg" />
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-200 rounded mb-4" />
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded w-20" />
                  <div className="h-8 bg-gray-200 rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRewards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500" data-testid="text-no-rewards">
              No rewards available in this category.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRewards.map((reward: Reward) => (
            <Card key={reward.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gradient-to-br from-[#FDC800] to-[#FDC800]/70 flex items-center justify-center">
                <Gift className="h-16 w-16 text-[#3C3C3B]" />
              </div>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg text-gray-900" data-testid={`reward-title-${reward.id}`}>
                    {reward.name}
                  </h3>
                  <Badge className="bg-[#FDC800] text-[#3C3C3B]" data-testid={`reward-category-${reward.id}`}>
                    {reward.category}
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
          ))}
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
  );
}
