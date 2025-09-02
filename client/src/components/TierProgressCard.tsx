import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Crown, Star, Compass, Trophy, Gem } from "lucide-react";
import { tierDisplayNames, tierColors, tierBenefits } from "@/utils/tierMapping";

interface TierProgressCardProps {
  currentTier: string;
  currentPoints: number;
  nextTier?: string;
  pointsToNext?: number;
  progress?: number;
}

const tierIcons = {
  starter: Star,
  explorer: Compass,
  champion: Trophy,
  elite: Crown,
};

export default function TierProgressCard({ 
  currentTier, 
  currentPoints, 
  nextTier, 
  pointsToNext, 
  progress = 0 
}: TierProgressCardProps) {
  const CurrentIcon = tierIcons[currentTier as keyof typeof tierIcons] || Star;
  const NextIcon = nextTier ? tierIcons[nextTier as keyof typeof tierIcons] : null;
  
  const currentColor = tierColors[currentTier as keyof typeof tierColors] || tierColors.starter;
  const benefits = tierBenefits[currentTier as keyof typeof tierBenefits] || tierBenefits.starter;
  const displayName = tierDisplayNames[currentTier as keyof typeof tierDisplayNames] || 'Maverick Starter';

  return (
    <Card className="bg-gradient-to-br from-gray-50 to-white border-2" data-testid="card-tier-progress">
      <CardHeader className="pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${currentColor}20` }}>
              <CurrentIcon className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: currentColor }} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg text-[#3C3C3B]">
                {displayName}
              </CardTitle>
              <p className="text-sm text-gray-600">{currentPoints.toLocaleString()} points</p>
            </div>
          </div>
          <Badge 
            className="capitalize font-semibold text-xs sm:text-sm w-fit text-white"
            style={{ 
              backgroundColor: currentColor
            }}
            data-testid={`badge-tier-${currentTier}`}
          >
            {currentTier}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
        {/* Current Tier Benefits */}
        <div>
          <h4 className="font-semibold text-sm text-[#3C3C3B] mb-2">Your Benefits</h4>
          <div className="flex flex-wrap gap-1">
            {benefits.slice(0, 3).map((benefit, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs bg-[#FDC800]/20 text-[#3C3C3B] break-words"
                data-testid={`benefit-${index}`}
              >
                {benefit}
              </Badge>
            ))}
            {benefits.length > 3 && (
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                +{benefits.length - 3} more
              </Badge>
            )}
          </div>
        </div>

        {/* Progress to Next Tier */}
        {nextTier && pointsToNext !== undefined && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-[#3C3C3B]">
                Progress to {tierDisplayNames[nextTier as keyof typeof tierDisplayNames] || nextTier}
              </h4>
              {NextIcon && (
                <NextIcon 
                  className="h-4 w-4" 
                  style={{ color: tierColors[nextTier as keyof typeof tierColors] }} 
                />
              )}
            </div>
            
            <div className="space-y-2">
              <Progress 
                value={progress} 
                className="h-3"
                data-testid="progress-next-tier"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>{progress.toFixed(1)}% complete</span>
                <span>{pointsToNext.toLocaleString()} points to go</span>
              </div>
            </div>

            {/* Next Tier Preview */}
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">
                Unlock with {tierDisplayNames[nextTier as keyof typeof tierDisplayNames] || nextTier}:
              </p>
              <div className="flex flex-wrap gap-1">
                {tierBenefits[nextTier as keyof typeof tierBenefits]?.slice(0, 2).map((benefit, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs"
                    data-testid={`next-benefit-${index}`}
                  >
                    {benefit}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Max Tier Reached */}
        {!nextTier && (
          <div className="text-center p-3 bg-gradient-to-r from-[#FDC800]/20 to-yellow-50 rounded-lg">
            <Crown className="h-8 w-8 mx-auto mb-2 text-[#FDC800]" />
            <p className="text-sm font-semibold text-[#3C3C3B]">
              Maximum Tier Achieved!
            </p>
            <p className="text-xs text-gray-600">
              You've reached the highest Maverick loyalty level
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}