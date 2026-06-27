import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { globalRateLimiter } from "./lib/rateLimiter";

const app: Express = express();

// Replit runs behind a reverse proxy — trust the X-Forwarded-For header
// so that express-rate-limit can correctly identify client IPs.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// CORS: prefer ALLOWED_ORIGINS; fall back to REPLIT_DOMAINS in production
// so the app works on first deploy without manual secret configuration.
// In development (NODE_ENV !== 'production'), allow all origins for convenience.
function buildAllowedOrigins(): string[] | boolean {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  }
  if (process.env.NODE_ENV !== "production") return true;
  // Production fallback: derive from Replit-managed REPLIT_DOMAINS
  const replitDomains = process.env.REPLIT_DOMAINS;
  if (replitDomains) {
    const origins = replitDomains
      .split(",")
      .map((d) => `https://${d.trim()}`);
    logger.info({ origins }, "ALLOWED_ORIGINS not set — using REPLIT_DOMAINS as CORS allowlist");
    return origins;
  }
  logger.warn("ALLOWED_ORIGINS and REPLIT_DOMAINS are both unset — CORS will reject cross-origin requests");
  return false;
}
const allowedOrigins = buildAllowedOrigins();

app.use(cors({ credentials: true, origin: allowedOrigins }));
app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true, limit: "512kb" }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use(globalRateLimiter);

app.use("/api", router);

export default app;
