/**
 * SPR-M001 Phase 1 — Mobile Shared Components Index
 *
 * Barrel export for all shared mobile UI components.
 * Components here are used across multiple screens/features.
 *
 * Screen-specific components live inside their feature module.
 *
 * ─── Currently available components ──────────────────────────────────────────
 *
 *  ErrorBoundary         — @/components/ErrorBoundary
 *  ErrorFallback         — @/components/ErrorFallback
 *  BurningCandleRN       — @/components/BurningCandleRN
 *  KeyboardAwareScrollViewCompat — @/components/KeyboardAwareScrollViewCompat
 *
 * ─── Components planned for future SPRs ──────────────────────────────────────
 *
 *  MobileCard            — Themed card surface with glass variant
 *  MobileButton          — Primary / secondary / ghost button
 *  MobileHeader          — Screen header with back button
 *  MobileSection         — Section wrapper with title + padding
 *  HebrewDateBadge       — Hebrew date chip with gold styling
 *  GoldDivider           — Thin gold horizontal rule
 *  LoadingSpinner        — Branded loading indicator
 *  EmptyState            — Illustrated empty state with CTA
 */

export { ErrorBoundary } from "@/components/ErrorBoundary";
export { ErrorFallback }  from "@/components/ErrorFallback";
