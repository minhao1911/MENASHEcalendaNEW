/**
 * Rate limiters for the Menashe Calendar API.
 *
 * Three tiers:
 *  - global   : 300 req / 15 min per IP  (applied globally)
 *  - ai       : 20  req / 15 min per IP  (chat, parsha/holiday insights)
 *  - payment  : 10  req / 15 min per IP  (order creation, verification)
 *
 * All limiters are IP-based and respond with a consistent { error } shape.
 */
import rateLimit from "express-rate-limit";

const handler = (message: string) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Too many requests — please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/healthz",
});

export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "AI request limit reached — please wait before trying again" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many payment requests — please wait before trying again" },
  standardHeaders: true,
  legacyHeaders: false,
});

export const pushSubscribeRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: "Too many subscription attempts — please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
