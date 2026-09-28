import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRedemptionRequest,
  removeQualifiedReward,
  type QualifiedReward,
} from "./qualifiedRewards";

const rewards: QualifiedReward[] = [
  {
    id: "reward-one",
    name: "Reward One",
    pointsCost: 100,
    category: "discounts",
    imageUrl: null,
  },
  {
    id: "reward-two",
    name: "Reward Two",
    pointsCost: 200,
    category: "experiences",
    imageUrl: null,
  },
];

test("builds the existing redemption endpoint request shape", () => {
  assert.deepEqual(buildRedemptionRequest(rewards[0]), {
    rewardId: "reward-one",
    pointsSpent: 100,
  });
});

test("save for later dismisses only the selected local reward", () => {
  const remaining = removeQualifiedReward(rewards, "reward-one");
  assert.deepEqual(remaining, [rewards[1]]);
  assert.equal(rewards.length, 2);
});

test("successful redemption can remove only the redeemed prompt", () => {
  assert.deepEqual(
    removeQualifiedReward(rewards, "reward-two").map(({ id }) => id),
    ["reward-one"],
  );
});