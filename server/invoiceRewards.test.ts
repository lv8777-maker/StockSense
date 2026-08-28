import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import PDFDocument from "pdfkit";
import { eq } from "drizzle-orm";
import {
  extractContractDuration,
  findPackage,
  normalizeContractDuration,
  parseInvoiceText,
} from "./invoiceProcessor";
import { findNewlyQualifiedRewards } from "./rewardQualification";
import { packageSeedRows } from "./seedPackages";
import { resolveSessionVerification } from "./phoneAuth";
import { seedPackageCatalog } from "./seedPackages";
import { db } from "./db";
import {
  invoiceSubmissions,
  receiptUploads,
  redemptions,
  rewardNotifications,
  rewards,
  transactions,
  users,
  type Reward,
} from "@shared/schema";
import { storage } from "./storage";
import { registerRoutes } from "./routes";
import { matchPackageInText } from "./receiptProcessor";
import {
  createReceiptDocumentFingerprint,
  createReceiptFingerprint,
  isReceiptDuplicateError,
} from "./receiptFingerprint";

async function createInvoicePdf(invoiceNumber: string): Promise<Buffer> {
  const document = new PDFDocument();
  const chunks: Buffer[] = [];
  document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  document.text(`
Invoice Number: ${invoiceNumber}
Invoice Date: 2026-08-27
CUSTOMER: Route Tester
Account Number: 123456
MSISDN: 27831234567
Package: MTN Home Starter MTM
Tariff: Month-to-Month
Activation Date: 2026-08-01
  `);
  document.end();
  await new Promise<void>((resolve, reject) => {
    document.on("end", resolve);
    document.on("error", reject);
  });
  return Buffer.concat(chunks);
}

async function postInvoice(
  invoiceNumber: string,
  overrides: {
    awardInvoicePoints?: typeof storage.awardInvoicePoints;
    getActiveRewards?: typeof storage.getActiveRewards;
  },
) {
  const originalAwardInvoicePoints = storage.awardInvoicePoints;
  const originalGetActiveRewards = storage.getActiveRewards;
  const originalGetUser = storage.getUser;
  const originalGetInvoiceByNumber = storage.getInvoiceByNumber;
  const app = express();
  app.use((req: any, _res, next) => {
    req.session = {
      user: { id: "route-test-user", isVerified: true },
    };
    next();
  });
  app.use(express.json());

  storage.getUser = async () => ({
    id: "route-test-user",
    firstName: "Route",
    lastName: "Tester",
    totalPoints: 25,
    isVerified: true,
  } as any);
  storage.getInvoiceByNumber = async () => undefined;
  if (overrides.awardInvoicePoints) {
    storage.awardInvoicePoints = overrides.awardInvoicePoints;
  }
  if (overrides.getActiveRewards) {
    storage.getActiveRewards = overrides.getActiveRewards;
  }

  const server = await registerRoutes(app);
  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const form = new FormData();
    form.append(
      "invoice",
      new Blob([await createInvoicePdf(invoiceNumber)], { type: "application/pdf" }),
      "invoice.pdf",
    );
    return await fetch(
      `http://127.0.0.1:${address.port}/api/invoices/upload`,
      { method: "POST", body: form },
    );
  } finally {
    storage.awardInvoicePoints = originalAwardInvoicePoints;
    storage.getActiveRewards = originalGetActiveRewards;
    storage.getUser = originalGetUser;
    storage.getInvoiceByNumber = originalGetInvoiceByNumber;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
  }
}

function reward(
  id: string,
  pointsCost: number,
  overrides: Partial<Reward> = {},
): Reward {
  return {
    id,
    name: `Reward ${id}`,
    description: null,
    pointsCost,
    category: "discounts",
    imageUrl: null,
    isActive: true,
    redemptionCount: 0,
    maxRedemptions: null,
    validUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

test("seeds the requested MTM packages using the canonical duration", () => {
  assert.deepEqual(packageSeedRows, [
    {
      name: "MTN Home Starter MTM",
      network: "MTN",
      contractDuration: "Month-to-Month",
      pointsAwarded: 100,
      status: "active",
    },
    {
      name: "MTN Home Pro MTM",
      network: "MTN",
      contractDuration: "Month-to-Month",
      pointsAwarded: 200,
      status: "active",
    },
  ]);
});

test("normalizes MTM and written month-to-month tariff variants", () => {
  assert.equal(normalizeContractDuration("MTN Home Starter MTM"), "Month-to-Month");
  assert.equal(extractContractDuration("Month-to-Month"), "Month-to-Month");
  assert.equal(extractContractDuration("month to month"), "Month-to-Month");
  assert.equal(extractContractDuration("24 MTH"), "24 Months");
  assert.equal(extractContractDuration("36 months"), "36 Months");
});

test("parses an MTM invoice into the canonical duration", () => {
  const parsed = parseInvoiceText(`
Invoice Number: MTM-001
Invoice Date: 2026-08-27
CUSTOMER: Test Customer
Account Number: 123456
MSISDN: 27831234567
Package: MTN Home Starter MTM
Tariff: MTN Home Starter MTM
Activation Date: 2026-08-01
  `);

  assert.ok(parsed);
  assert.equal(parsed.contractDuration, "Month-to-Month");
  assert.equal(parsed.packageName, "MTN Home Starter MTM");
});

test("recognizes MTM when it appears in the package name only", () => {
  const parsed = parseInvoiceText(`
Invoice Number: MTM-002
Invoice Date: 2026-08-27
CUSTOMER: Test Customer
Account Number: 123456
MSISDN: 27831234567
Package: MTN Home Starter MTM
Tariff: Standard recurring tariff
Activation Date: 2026-08-01
  `);

  assert.ok(parsed);
  assert.equal(parsed.contractDuration, "Month-to-Month");
});

test("uses an explicit tariff duration before a package-name fallback", () => {
  const parsed = parseInvoiceText(`
Invoice Number: TERM-001
Invoice Date: 2026-08-27
CUSTOMER: Test Customer
Account Number: 123456
MSISDN: 27831234567
Package: MTN Home Starter MTM
Tariff: Promotional 24 MTH contract
Activation Date: 2026-08-01
  `);

  assert.ok(parsed);
  assert.equal(parsed.contractDuration, "24 Months");
});

test("returns every reward threshold crossed by this award", () => {
  const qualified = findNewlyQualifiedRewards(
    [reward("50", 50), reward("100", 100), reward("125", 125), reward("200", 200)],
    40,
    150,
  );

  assert.deepEqual(
    qualified.map(({ id }) => id),
    ["50", "100", "125"],
  );
});

test("does not repeat rewards affordable before the invoice", () => {
  const qualified = findNewlyQualifiedRewards(
    [reward("100", 100), reward("200", 200)],
    100,
    200,
  );

  assert.deepEqual(
    qualified.map(({ id }) => id),
    ["200"],
  );
});

test("returns no rewards when the award crosses no threshold", () => {
  assert.deepEqual(
    findNewlyQualifiedRewards([reward("500", 500)], 100, 200),
    [],
  );
});

test("refreshing points preserves trusted phone-session verification", () => {
  assert.equal(resolveSessionVerification(true, false), true);
  assert.equal(resolveSessionVerification(false, true), true);
  assert.equal(resolveSessionVerification(false, false), false);
});

test("receipt fingerprints identify identical files", () => {
  const original = Buffer.from("same receipt bytes");
  assert.equal(
    createReceiptFingerprint(original),
    createReceiptFingerprint(Buffer.from(original)),
  );
  assert.notEqual(
    createReceiptFingerprint(original),
    createReceiptFingerprint(Buffer.from("different receipt bytes")),
  );
  assert.equal(
    createReceiptDocumentFingerprint(
      "Invoice Number:\nINV-123\nCustomer: Test",
    ),
    createReceiptDocumentFingerprint(
      "INVOICE NUMBER: inv 123\nDifferent layout and customer text",
    ),
  );
});

test("receipt duplicate errors are recognized through database wrappers", () => {
  const postgresError = {
    code: "23505",
    constraint: "receipt_uploads_user_file_hash_unique",
  };
  assert.equal(isReceiptDuplicateError(postgresError), true);
  assert.equal(isReceiptDuplicateError({ cause: postgresError }), true);
  assert.equal(
    isReceiptDuplicateError({
      cause: {
        code: "23505",
        message:
          'duplicate key violates unique constraint "receipt_uploads_user_file_hash_unique"',
      },
    }),
    true,
  );
  assert.equal(
    isReceiptDuplicateError({
      code: "23505",
      constraint: "some_other_unique_constraint",
    }),
    false,
  );
  assert.equal(
    isReceiptDuplicateError({
      cause: {
        code: "23505",
        constraint: "receipt_uploads_user_document_hash_unique",
      },
    }),
    true,
  );
});

test(
  "integrates the seeded MTM invoice award with newly qualified rewards",
  { timeout: 20_000 },
  async () => {
    const userId = randomUUID();
    const rewardId = randomUUID();
    const invoiceNumber = `TEST-${randomUUID()}`;

    try {
      await seedPackageCatalog();
      await db.insert(users).values({
        id: userId,
        firstName: "Integration",
        lastName: "Tester",
        totalPoints: 40,
        isVerified: true,
      });
      await db.insert(rewards).values({
        id: rewardId,
        name: "Integration Reward",
        pointsCost: 100,
        category: "discounts",
        isActive: true,
      });

      const fileHash = createReceiptFingerprint(Buffer.from("duplicate-test"));
      const documentHash = createReceiptDocumentFingerprint(
        "Invoice Number: TEST-DUPLICATE-001",
      );
      await db.insert(receiptUploads).values({
        userId,
        fileName: "original.pdf",
        fileUrl: "/uploads/receipts/original.pdf",
        fileHash,
        documentHash,
        status: "completed",
      });
      await assert.rejects(
        db.insert(receiptUploads).values({
          userId,
          fileName: "duplicate.pdf",
          fileUrl: "/uploads/receipts/duplicate.pdf",
          fileHash,
          documentHash,
          status: "processing",
        }),
        (error: any) =>
          error?.cause?.code === "23505" || error?.code === "23505",
      );
      await assert.rejects(
        db.insert(receiptUploads).values({
          userId,
          fileName: "resaved-copy.pdf",
          fileUrl: "/uploads/receipts/resaved-copy.pdf",
          fileHash: createReceiptFingerprint(Buffer.from("different file bytes")),
          documentHash,
          status: "processing",
        }),
        (error: any) =>
          error?.cause?.code === "23505" || error?.code === "23505",
      );
      assert.equal((await storage.getUser(userId))?.totalPoints, 40);

      const parsed = parseInvoiceText(`
Invoice Number: ${invoiceNumber}
Invoice Date: 2026-08-27
CUSTOMER: Integration Tester
Account Number: 123456
MSISDN: 27831234567
Package: MTN Home Starter MTM
Tariff: Month-to-Month
Activation Date: 2026-08-01
      `);
      assert.ok(parsed);

      const matchedPackage = await findPackage(
        parsed.packageName,
        parsed.contractDuration,
      );
      assert.deepEqual(matchedPackage, {
        name: "MTN Home Starter MTM",
        pointsAwarded: 100,
      });

      const { transaction: sourceTransaction } = await storage.awardInvoicePoints(
        {
          invoiceNumber: parsed.invoiceNumber,
          userId,
          packageName: matchedPackage.name,
          contractDuration: parsed.contractDuration,
          pointsAwarded: matchedPackage.pointsAwarded,
        },
        {
          type: "invoice_upload",
          description: "Integration-test MTM invoice award",
          amount: "0.00",
          pointsEarned: matchedPackage.pointsAwarded,
          pointsSpent: 0,
          status: "completed",
          orderId: parsed.invoiceNumber,
        },
      );

      const updatedUser = await storage.getUser(userId);
      assert.equal(updatedUser?.totalPoints, 140);

      const qualified = findNewlyQualifiedRewards(
        await storage.getActiveRewards(),
        40,
        updatedUser?.totalPoints ?? 0,
      );
      assert.deepEqual(
        qualified.find(({ id }) => id === rewardId),
        {
          id: rewardId,
          name: "Integration Reward",
          pointsCost: 100,
          category: "discounts",
          imageUrl: null,
        },
      );

      const notification = await storage.createRewardNotification({
        userId,
        rewardId,
        sourceTransactionId: sourceTransaction.id,
        status: "pending",
      });
      assert.deepEqual(
        (await storage.getPendingRewardNotifications(userId)).find(
          ({ id }) => id === notification.id,
        ),
        {
          ...notification,
          name: "Integration Reward",
          pointsCost: 100,
          category: "discounts",
          imageUrl: null,
        },
      );
      assert.equal(
        await storage.resolveRewardNotification(
          notification.id,
          randomUUID(),
          "dismissed",
        ),
        false,
      );

      const firstRedemption = await storage.redeemReward(
        userId,
        rewardId,
        notification.id,
      );
      assert.equal(firstRedemption.idempotent, false);
      assert.equal(firstRedemption.redemption.pointsSpent, 100);
      assert.equal((await storage.getUser(userId))?.totalPoints, 40);

      const retriedRedemption = await storage.redeemReward(
        userId,
        rewardId,
        notification.id,
      );
      assert.equal(retriedRedemption.idempotent, true);
      assert.equal(
        retriedRedemption.redemption.id,
        firstRedemption.redemption.id,
      );
      assert.equal((await storage.getUser(userId))?.totalPoints, 40);
      assert.equal(
        (await storage.getUserRedemptions(userId)).filter(
          ({ rewardId: redeemedRewardId }) => redeemedRewardId === rewardId,
        ).length,
        1,
      );
      assert.equal(
        (await storage.getPendingRewardNotifications(userId)).some(
          ({ id }) => id === notification.id,
        ),
        false,
      );

      assert.deepEqual(
        await matchPackageInText(
          "Package: MTN Home Starter MTM Tariff: 1 MTH MTN Home Starter MTM @ R295",
        ),
        { name: "MTN Home Starter MTM", points: 100 },
      );
      assert.deepEqual(
        await matchPackageInText(
          "Package: MTN Home Pro MTM Tariff: 1 MTH MTN Home Pro MTM @ R465",
        ),
        { name: "MTN Home Pro MTM", points: 200 },
      );
    } finally {
      await db.delete(rewardNotifications).where(eq(rewardNotifications.userId, userId));
      await db.delete(redemptions).where(eq(redemptions.userId, userId));
      await db.delete(invoiceSubmissions).where(eq(invoiceSubmissions.userId, userId));
      await db.delete(receiptUploads).where(eq(receiptUploads.userId, userId));
      await db.delete(transactions).where(eq(transactions.userId, userId));
      await db.delete(rewards).where(eq(rewards.id, rewardId));
      await db.delete(users).where(eq(users.id, userId));
    }
  },
);

test(
  "rolls back the invoice when transaction creation fails",
  { timeout: 20_000 },
  async () => {
    const userId = randomUUID();
    const invoiceNumber = `ROLLBACK-${randomUUID()}`;

    try {
      await db.insert(users).values({ id: userId, totalPoints: 25 });
      await db.insert(transactions).values({
        userId,
        type: "invoice_upload",
        description: "Existing transaction used to force a ledger conflict",
        amount: "0.00",
        pointsEarned: 0,
        pointsSpent: 0,
        status: "completed",
        orderId: invoiceNumber,
      });

      await assert.rejects(
        storage.awardInvoicePoints(
          {
            invoiceNumber,
            userId,
            packageName: "Rollback Test Package",
            contractDuration: "Month-to-Month",
            pointsAwarded: 100,
          },
          {
            type: "invoice_upload",
            description: "This transaction must fail its unique order constraint",
            amount: "0.00",
            pointsEarned: 100,
            pointsSpent: 0,
            status: "completed",
            orderId: invoiceNumber,
          },
        ),
      );

      assert.equal(await storage.getInvoiceByNumber(invoiceNumber), undefined);
      assert.equal((await storage.getUser(userId))?.totalPoints, 25);
      assert.equal(
        (await storage.getUserTransactions(userId)).filter(
          ({ orderId }) => orderId === invoiceNumber,
        ).length,
        1,
      );
    } finally {
      await db.delete(invoiceSubmissions).where(eq(invoiceSubmissions.invoiceNumber, invoiceNumber));
      await db.delete(transactions).where(eq(transactions.orderId, invoiceNumber));
      await db.delete(users).where(eq(users.id, userId));
    }
  },
);

test(
  "concurrent duplicate invoice claims award points exactly once",
  { timeout: 20_000 },
  async () => {
    const userId = randomUUID();
    const invoiceNumber = `RACE-${randomUUID()}`;
    const submission = {
      invoiceNumber,
      userId,
      packageName: "Concurrency Test Package",
      contractDuration: "Month-to-Month",
      pointsAwarded: 100,
    };
    const transaction = {
      type: "invoice_upload",
      description: "Concurrent invoice award test",
      amount: "0.00",
      pointsEarned: 100,
      pointsSpent: 0,
      status: "completed",
      orderId: invoiceNumber,
    };

    try {
      await db.insert(users).values({ id: userId, totalPoints: 0 });

      const results = await Promise.allSettled([
        storage.awardInvoicePoints(submission, transaction),
        storage.awardInvoicePoints(submission, transaction),
      ]);

      assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
      assert.equal(results.filter(({ status }) => status === "rejected").length, 1);
      assert.equal((await storage.getUser(userId))?.totalPoints, 100);
      assert.equal(
        (await storage.getUserTransactions(userId)).filter(
          ({ orderId }) => orderId === invoiceNumber,
        ).length,
        1,
      );
    } finally {
      await db.delete(invoiceSubmissions).where(eq(invoiceSubmissions.invoiceNumber, invoiceNumber));
      await db.delete(transactions).where(eq(transactions.orderId, invoiceNumber));
      await db.delete(users).where(eq(users.id, userId));
    }
  },
);

test(
  "invoice upload reports an invoice-number conflict as already used",
  { timeout: 20_000, concurrency: false },
  async () => {
    await seedPackageCatalog();
    const response = await postInvoice(`ROUTE-DUPLICATE-${randomUUID()}`, {
      awardInvoicePoints: async () => {
        throw {
          cause: {
            code: "23505",
            constraint: "invoice_submissions_invoice_number_unique",
          },
        };
      },
    });

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      message: "This invoice has already been used to claim points and cannot be submitted again.",
    });
  },
);

test(
  "invoice upload reports other atomic conflicts as safe to retry",
  { timeout: 20_000, concurrency: false },
  async () => {
    await seedPackageCatalog();
    const response = await postInvoice(`ROUTE-TRANSACTION-${randomUUID()}`, {
      awardInvoicePoints: async () => {
        throw {
          cause: {
            code: "23505",
            constraint: "transactions_user_id_order_id_unique",
          },
        };
      },
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      message: "We couldn't credit your points. Your invoice was not used, so please try again.",
    });
  },
);

test(
  "invoice upload succeeds when reward lookup fails after the award commits",
  { timeout: 20_000, concurrency: false },
  async () => {
    await seedPackageCatalog();
    const invoiceNumber = `ROUTE-REWARD-${randomUUID()}`;
    const response = await postInvoice(invoiceNumber, {
      awardInvoicePoints: async (submission) => ({
        submission: {
          id: "committed-submission",
          ...submission,
        },
        transaction: { id: "committed-transaction" },
        user: { id: "route-test-user", totalPoints: 125 },
      } as any),
      getActiveRewards: async () => {
        throw new Error("reward lookup unavailable");
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      message: "🎉 You've earned 100 points for your MTN MTN Home Starter MTM contract!",
      pointsAwarded: 100,
      packageName: "MTN Home Starter MTM",
      contractDuration: "Month-to-Month",
      invoiceNumber,
      submissionId: "committed-submission",
      newlyQualifiedRewards: [],
    });
  },
);
