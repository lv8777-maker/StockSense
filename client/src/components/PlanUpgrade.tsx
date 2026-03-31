import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { availablePlans, getTierFromPlan } from "@/utils/tierMapping";
import { ArrowUp, Crown, Gift } from "lucide-react";

interface PlanUpgradeProps {
  currentPlan?: string;
  currentTier?: string;
  currentPoints?: number;
}

export default function PlanUpgrade({ currentPlan, currentTier, currentPoints = 0 }: PlanUpgradeProps) {
  const [selectedPlan, setSelectedPlan] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const upgradeMutation = useMutation({
    mutationFn: async (newPlan: string) => {
      return await apiRequest("POST", "/api/auth/upgrade-plan", { newPlan });
    },
    onSuccess: (data) => {
      toast({
        title: "Plan Upgraded Successfully!",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSelectedPlan("");
    },
    onError: (error: Error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = () => {
    if (!selectedPlan) {
      toast({
        title: "No Plan Selected",
        description: "Please select a plan to upgrade to.",
        variant: "destructive",
      });
      return;
    }

    upgradeMutation.mutate(selectedPlan);
  };

  const selectedPlanInfo = selectedPlan ? getTierFromPlan(selectedPlan) : null;
  const availableUpgrades = availablePlans.filter(plan => plan.value !== currentPlan);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-[#3C3C3B]">
          <ArrowUp className="h-5 w-5" />
          <span>Upgrade Your Plan</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Plan Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-700">Current Plan:</span>
            <Badge variant="outline" className="bg-white">
              {currentPlan || 'Not Selected'}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Tier: {currentTier || 'starter'}</span>
            <span>Points: {currentPoints}</span>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Select New Plan
          </label>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger data-testid="select-upgrade-plan">
              <SelectValue placeholder="Choose a plan to upgrade to" />
            </SelectTrigger>
            <SelectContent>
              {availableUpgrades.map((plan) => (
                <SelectItem key={plan.value} value={plan.value}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upgrade Preview */}
        {selectedPlanInfo && (
          <div className="p-3 bg-[#FDC800]/10 rounded-lg border border-[#FDC800]/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4 text-[#FDC800]" />
                <span className="font-medium text-[#3C3C3B]">
                  {selectedPlanInfo.displayName}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Gift className="h-4 w-4 text-[#FDC800]" />
                <span className="font-bold text-[#FDC800]">
                  +{selectedPlanInfo.points} points
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-3">
              <strong>Benefits:</strong> {selectedPlanInfo.benefits.slice(0, 2).join(", ")}
              {selectedPlanInfo.benefits.length > 2 && ` and ${selectedPlanInfo.benefits.length - 2} more`}
            </div>
            <div className="text-xs text-gray-500">
              New total points: {currentPoints + selectedPlanInfo.points}
            </div>
          </div>
        )}

        {/* Upgrade Button */}
        <Button
          onClick={handleUpgrade}
          disabled={!selectedPlan || upgradeMutation.isPending}
          className="w-full bg-[#FDC800] hover:bg-[#FDC800]/90 text-[#3C3C3B] font-semibold"
          data-testid="button-upgrade-plan"
        >
          {upgradeMutation.isPending ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-[#3C3C3B] border-t-transparent rounded-full animate-spin" />
              <span>Upgrading...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <ArrowUp className="h-4 w-4" />
              <span>Upgrade Plan</span>
            </div>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          You'll receive bonus points for upgrading and gain access to new tier benefits
        </p>
      </CardContent>
    </Card>
  );
}