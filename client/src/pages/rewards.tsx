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

  const redeemMutation = useMutation({
    mutationFn: async (rewardData: { rewardId: string; pointsSpent: number }) => {
      return await apiRequest("POST", "/api/redemptions", rewardData);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Reward redeemed successfully. Check your redemptions.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/redemptions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
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
    ? rewards 
    : rewards.filter((reward: Reward) => reward.category === selectedCategory);

  const handleRedeem = (reward: Reward) => {
    if (!user || user.totalPoints < reward.pointsCost) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.pointsCost} points to redeem this reward.`,
        variant: "destructive",
      });
      return;
    }

    redeemMutation.mutate({
      rewardId: reward.id,
      pointsSpent: reward.pointsCost,
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
          {filteredRewards.map((reward: any) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              userPoints={user?.totalPoints || 0}
              onRedeem={() => handleRedeem(reward)}
              isRedeeming={redeemMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
