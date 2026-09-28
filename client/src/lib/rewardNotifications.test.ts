import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import RewardQualificationNotifications from "../components/RewardQualificationNotifications";

test("renders every pending reward notification with both actions", () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["/api/dashboard/reward-notifications"], [
    {
      id: "notification-one",
      rewardId: "reward-one",
      name: "Starter Reward",
      pointsCost: 50,
      category: "discounts",
      imageUrl: null,
      status: "pending",
      createdAt: "2026-08-27T12:00:00.000Z",
    },
    {
      id: "notification-two",
      rewardId: "reward-two",
      name: "Second Reward",
      pointsCost: 100,
      category: "food",
      imageUrl: null,
      status: "pending",
      createdAt: "2026-08-27T12:00:01.000Z",
    },
  ]);

  const html = renderToStaticMarkup(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(RewardQualificationNotifications),
    ),
  );

  assert.match(html, /Starter Reward/);
  assert.match(html, /Second Reward/);
  assert.equal(html.match(/Redeem now/g)?.length, 2);
  assert.equal(html.match(/Save for later/g)?.length, 2);
});