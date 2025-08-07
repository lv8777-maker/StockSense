import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RewardCardProps {
  reward: {
    id: string;
    name: string;
    description: string;
    pointsCost: number;
    category: string;
    imageUrl?: string;
    redemptionCount: number;
  };
  userPoints: number;
  onRedeem: () => void;
  isRedeeming: boolean;
}

export default function RewardCard({ reward, userPoints, onRedeem, isRedeeming }: RewardCardProps) {
  const canRedeem = userPoints >= reward.pointsCost;
  const isPopular = reward.redemptionCount > 20;

  // Fallback images for different categories
  const getCategoryImage = (category: string) => {
    const images = {
      food: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      merchandise: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      experiences: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
      discounts: "https://images.unsplash.com/photo-1549298916-b41d501d3772?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
    };
    return images[category as keyof typeof images] || images.food;
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`card-reward-${reward.id}`}>
      <img 
        src={reward.imageUrl || getCategoryImage(reward.category)}
        alt={reward.name}
        className="w-full h-48 object-cover"
        data-testid={`img-reward-${reward.id}`}
      />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-reward-name-${reward.id}`}>
            {reward.name}
          </h3>
          {isPopular && (
            <Badge className="bg-accent text-white">Popular</Badge>
          )}
        </div>
        <p className="text-gray-600 text-sm mb-4" data-testid={`text-reward-description-${reward.id}`}>
          {reward.description}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-2xl font-bold text-primary" data-testid={`text-reward-cost-${reward.id}`}>
            {reward.pointsCost} <span className="text-sm font-normal text-gray-500">points</span>
          </span>
          <Button 
            onClick={onRedeem}
            disabled={!canRedeem || isRedeeming}
            className={canRedeem ? "bg-primary hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"}
            data-testid={`button-redeem-${reward.id}`}
          >
            {isRedeeming ? "Redeeming..." : canRedeem ? "Redeem" : "Insufficient Points"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
