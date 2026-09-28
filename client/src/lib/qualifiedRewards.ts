export interface QualifiedReward {
  id: string;
  name: string;
  pointsCost: number;
  category: string;
  imageUrl: string | null;
}

export function buildRedemptionRequest(reward: QualifiedReward) {
  return {
    rewardId: reward.id,
    pointsSpent: reward.pointsCost,
  };
}

export function removeQualifiedReward(
  rewards: QualifiedReward[],
  rewardId: string,
): QualifiedReward[] {
  return rewards.filter((reward) => reward.id !== rewardId);
}