import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { doubleCsrf } from "csrf-csrf";
import { getSession } from "./phoneAuth";
import { seedPackageCatalog } from "./seedPackages";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Trust proxy for secure cookies in production
app.set("trust proxy", 1);

// Cookie parser REQUIRED for csrf-csrf (must be before session and CSRF)
app.use(cookieParser());

// Session middleware (required for CSRF)
app.use(getSession());

// CSRF Protection setup - comes after session
const csrfUtilities = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || "default-csrf-secret-change-in-production",
  getSessionIdentifier: (req) => (req as any).sessionID || "anonymous", // Uses express-session's sessionID
  cookieName: "x-csrf-token",
  cookieOptions: {
    sameSite: "lax",
    path: "/",
    secure: false, // Set to false for development to avoid cookie issues
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"], // Don't protect read-only methods
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"], // Explicitly check header
});

// Make CSRF functions available to routes
app.locals.csrfProtection = csrfUtilities.doubleCsrfProtection;
app.locals.generateCsrfToken = csrfUtilities.generateCsrfToken;

// Apply CSRF protection to all /api routes (automatically skips GET/HEAD/OPTIONS)
app.use("/api", csrfUtilities.doubleCsrfProtection);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const packageSeed = await seedPackageCatalog();
  log(
    `package catalogue ready (${packageSeed.inserted} added, ${packageSeed.updated} refreshed)`,
  );
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const isCsrfRejection = status === 403 && (
      err.code === "EBADCSRFTOKEN" ||
      /csrf/i.test(err.message || "")
    );
    const message = isCsrfRejection
      ? "Your security session expired. Refresh the page and try again."
      : err.message || "Internal Server Error";

    res.status(status).json({ message });
    if (status >= 500) {
      console.error(err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
