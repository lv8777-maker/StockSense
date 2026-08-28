import type { Reward } from "@shared/schema";

export type NewlyQualifiedReward = Pick<
  Reward,
  "id" | "name" | "pointsCost" | "category" | "imageUrl"
>;

export function findNewlyQualifiedRewards(
  rewards: Reward[],
  pointsBeforeAward: number,
  pointsAfterAward: number,
): NewlyQualifiedReward[] {
  return rewards
    .filter(
      (reward) =>
        pointsBeforeAward < reward.pointsCost &&
        pointsAfterAward >= reward.pointsCost,
    )
    .map(({ id, name, pointsCost, category, imageUrl }) => ({
      id,
      name,
      pointsCost,
      category,
      imageUrl,
    }));
}