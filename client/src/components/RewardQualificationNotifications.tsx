import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Coins, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RewardNotification {
  id: string;
  rewardId: string;
  name: string;
  pointsCost: number;
  category: string | null;
  imageUrl: string | null;
  status: string;
  createdAt: string;
}

const categoryLabel = (category: string | null) => {
  switch (category) {
    case "food":
      return "Food & Drinks";
    case "merchandise":
      return "Merchandise";
    case "experiences":
      return "Experience";
    case "discounts":
      return "Airtime / Data";
    default:
      return category || "Reward";
  }
};

export default function RewardQualificationNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useQuery<RewardNotification[]>({
    queryKey: ["/api/dashboard/reward-notifications"],
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ notification, action }: { notification: RewardNotification; action: "redeem" | "dismiss" }) => {
      if (action === "redeem") {
        const redemptionResponse = await apiRequest("POST", "/api/redemptions", {
          rewardId: notification.rewardId,
          notificationId: notification.id,
        });
        await redemptionResponse.json();
      }

      const notificationResponse = await apiRequest(
        "PATCH",
        `/api/dashboard/reward-notifications/${notification.id}`,
        { action },
      );
      return notificationResponse.json();
    },
    onSuccess: async (_data, variables) => {
      if (variables.action === "redeem") {
        toast({
          title: "Reward claimed successfully",
          description: `${variables.notification.name} has been added to your rewards.`,
        });
        try {
          await Promise.all([
            queryClient.refetchQueries({ queryKey: ["/api/auth/user"] }),
            queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] }),
            queryClient.refetchQueries({ queryKey: ["/api/dashboard/reward-notifications"] }),
          ]);
        } catch (error) {
          console.error("Error refreshing reward data:", error);
        }
        queryClient.invalidateQueries({ queryKey: ["/api/redemptions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activity"] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/reward-notifications"] });
      }
    },
    onError: (error: Error, variables) => {
      toast({
        title: variables.action === "redeem" ? "Claim failed" : "Could not save reward",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (notifications.length === 0) return null;

  return (
    <section aria-labelledby="qualified-rewards-heading" className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Gift className="h-5 w-5 text-[#FDC800]" aria-hidden="true" />
        <div>
          <h2 id="qualified-rewards-heading" className="font-bold text-[#3C3C3B]">You can claim a reward</h2>
          <p className="text-xs text-gray-600">Your latest purchase unlocked {notifications.length === 1 ? "this reward" : "these rewards"}.</p>
        </div>
      </div>
      {notifications.map((notification) => {
        const isWorking = resolveMutation.isPending && resolveMutation.variables?.notification.id === notification.id;
        return (
          <article
            key={notification.id}
            className="overflow-hidden rounded-lg border border-[#FDC800]/60 bg-gradient-to-r from-[#FDC800]/15 via-yellow-50 to-white shadow-sm"
            data-testid={`reward-notification-${notification.id}`}
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="h-20 w-full shrink-0 overflow-hidden rounded-md bg-[#3C3C3B] sm:w-28">
                {notification.imageUrl ? (
                  <img src={notification.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Gift className="h-8 w-8 text-[#FDC800]" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[#3C3C3B]">{notification.name}</h3>
                  <Badge className="bg-[#FDC800] text-[#3C3C3B]">{categoryLabel(notification.category)}</Badge>
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-[#3C3C3B]">
                  <Coins className="h-4 w-4 text-[#D6A800]" aria-hidden="true" />
                  {notification.pointsCost.toLocaleString()} points
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:w-36">
                <Button
                  className="bg-[#FDC800] text-[#3C3C3B] hover:bg-[#FDC800]/90"
                  onClick={() => resolveMutation.mutate({ notification, action: "redeem" })}
                  disabled={isWorking}
                  data-testid={`button-redeem-notification-${notification.id}`}
                >
                  {isWorking ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Redeeming reward" /> : "Redeem now"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => resolveMutation.mutate({ notification, action: "dismiss" })}
                  disabled={isWorking}
                  data-testid={`button-dismiss-notification-${notification.id}`}
                >
                  Save for later
                </Button>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}