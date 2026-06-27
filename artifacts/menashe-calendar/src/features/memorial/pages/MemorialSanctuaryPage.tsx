import { useCallback } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import { useOnlineStatus } from "../../../hooks/useOnlineStatus";
import { useSearch } from "../hooks/useSearch";
import { useCollections } from "../hooks/useCollections";
import { GOLD } from "../../../lib/theme";
import {
  SanctuaryHeader,
  SanctuaryHero,
  SectionTitle,
  GlassPanel,
  MemorialPlaceholderCard,
  PortraitCard,
  EmptyState,
  LoadingState,
} from "../components";
import type { MemorialWithPerson } from "../types";

interface MemorialSanctuaryPageProps {
  onBack: () => void;
  onCreateMemorial?: () => void;
  onEnter3D?: () => void;
  onSelectMemorial?: (slug: string) => void;
}

// ── Portrait Strip (horizontal, featured) ─────────────────────────────────────

function PortraitStrip({
  title,
  icon,
  items,
  status,
  onSelect,
  emptyTitle,
  viewAll,
  compact = false,
}: {
  title: string;
  icon: string;
  items: MemorialWithPerson[];
  status: string;
  onSelect: (slug: string) => void;
  emptyTitle: string;
  viewAll?: () => void;
  compact?: boolean;
}) {
  if (status === "error" || (status === "success" && items.length === 0)) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <SectionTitle
        title={title}
        icon={icon}
        action={
          viewAll ? (
            <button
              onClick={viewAll}
              style={{
                fontSize: 12,
                color: GOLD,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                padding: "4px 0",
              }}
            >
              See all
            </button>
          ) : undefined
        }
      />

      {status === "loading" && (
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          } as React.CSSProperties}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <PortraitCard key={i} shimmer compact={compact} />
          ))}
        </div>
      )}

      {status === "success" && items.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {items.slice(0, 8).map((m) => (
            <PortraitCard
              key={m.id}
              name={m.person.fullName}
              hebrewName={m.person.hebrewName}
              deathDate={m.person.deathDate}
              candleCount={m.candleCount}
              compact={compact}
              onClick={() => onSelect(m.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Search Results List ────────────────────────────────────────────────────────

function SearchResultsList({
  results,
  total,
  hasMore,
  status,
  error,
  query,
  onSelect,
  onLoadMore,
  onClear,
  onRetry,
  t,
}: {
  results: MemorialWithPerson[];
  total: number;
  hasMore: boolean;
  status: string;
  error: Error | null;
  query: string;
  onSelect: (slug: string) => void;
  onLoadMore: () => void;
  onClear: () => void;
  onRetry: () => void;
  t: Record<string, string>;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <SectionTitle
        title={status === "loading" ? t.memShellLoading : t.memShellResults}
        icon="🔍"
        count={status === "success" ? total : undefined}
        action={
          <button
            onClick={onClear}
            style={{
              fontSize: 12,
              color: GOLD,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              padding: "4px 0",
            }}
          >
            {t.memClearSearch}
          </button>
        }
      />

      {status === "loading" && <LoadingState rows={4} />}

      {status === "error" && (
        <EmptyState
          icon="⚠️"
          title={t.memShellSearchError}
          subtitle={error?.message}
          action={
            <button
              onClick={onRetry}
              style={{
                fontSize: 13,
                color: GOLD,
                background: "rgba(212,168,67,0.1)",
                border: "1px solid rgba(212,168,67,0.3)",
                borderRadius: 10,
                padding: "8px 18px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {t.memShellRetry}
            </button>
          }
        />
      )}

      {status === "success" && results.length === 0 && (
        <EmptyState
          icon="🕊"
          title={t.memNoResults}
          subtitle={`${t.memShellEmptySearch} "${query}"`}
        />
      )}

      {status === "success" && results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {results.map((m) => (
            <MemorialPlaceholderCard
              key={m.id}
              name={m.person.fullName}
              hebrewName={m.person.hebrewName}
              deathDate={m.person.deathDate}
              candleCount={m.candleCount}
              onClick={() => onSelect(m.slug)}
            />
          ))}
          {hasMore && (
            <button
              onClick={onLoadMore}
              style={{
                padding: "12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {t.memShellLoadMore}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Subtle Enter Sanctuary CTA ─────────────────────────────────────────────────

function EnterSanctuaryCTA({
  onEnter,
  label,
  sublabel,
}: {
  onEnter: () => void;
  label: string;
  sublabel: string;
}) {
  return (
    <button
      onClick={onEnter}
      style={{
        width: "100%",
        padding: "14px 18px",
        borderRadius: 14,
        background:
          "linear-gradient(135deg, rgba(212,168,67,0.07) 0%, rgba(212,168,67,0.03) 100%)",
        border: "1px solid rgba(212,168,67,0.16)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        marginBottom: 12,
        boxSizing: "border-box",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {/* Night landscape thumbnail */}
      <div
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: 10,
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(180deg, #03090f 0%, #081420 50%, #0a1a0a 100%)",
          border: "1px solid rgba(212,168,67,0.18)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 44 24" style={{ position: "absolute", bottom: 0, width: "100%", height: 18 }}>
          <polygon points="0,24 8,10 16,16 24,6 32,14 38,8 44,12 44,24" fill="#071209" />
        </svg>
        <div
          style={{
            position: "absolute",
            bottom: 2,
            left: "50%",
            transform: "translateX(-50%)",
            width: 24,
            height: 12,
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(212,168,67,0.5) 0%, transparent 70%)",
            filter: "blur(3px)",
          }}
        />
        <span
          style={{
            position: "relative",
            fontSize: 16,
            paddingBottom: 10,
            zIndex: 1,
            filter: "drop-shadow(0 0 4px rgba(212,168,67,0.7))",
          }}
        >
          🕯
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: GOLD,
            marginBottom: 2,
            letterSpacing: "0.01em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(212,168,67,0.48)",
            lineHeight: 1.4,
          }}
        >
          {sublabel}
        </div>
      </div>

      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={GOLD}
        strokeWidth="2.5"
        style={{ flexShrink: 0, opacity: 0.45 }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ── Subtle Create Memorial CTA ─────────────────────────────────────────────────

function CreateMemorialCTA({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <button
      onClick={onPress}
      style={{
        width: "100%",
        padding: "12px 18px",
        borderRadius: 12,
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.07)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        marginBottom: 28,
        boxSizing: "border-box",
        transition: "border-color 0.15s",
      }}
    >
      <span style={{ fontSize: 16, opacity: 0.55 }}>✡</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,0.42)",
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="2.5"
        style={{ marginLeft: "auto", flexShrink: 0 }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: "rgba(255,255,255,0.05)",
        marginBottom: 28,
      }}
    />
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MemorialSanctuaryPage({
  onBack,
  onCreateMemorial,
  onEnter3D,
  onSelectMemorial,
}: MemorialSanctuaryPageProps) {
  const { t } = useLanguage();
  const isOnline = useOnlineStatus();

  const {
    results,
    total,
    hasMore,
    status: searchStatus,
    error: searchError,
    query,
    setQuery,
    loadMore,
    reset: resetSearch,
  } = useSearch();

  const collections = useCollections();

  const isSearching = query.trim().length > 0;

  const handleSelect = useCallback(
    (slug: string) => { if (onSelectMemorial) onSelectMemorial(slug); },
    [onSelectMemorial],
  );

  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--background, #080e1a)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {/* ── 1. Sticky Header ── */}
      <SanctuaryHeader onBack={onBack} title={t.memTitle} subtitle={t.memSubtitle} />

      {/* ── 2. Cinematic Hero + Floating Search ── */}
      <SanctuaryHero
        title={t.memShellWelcome}
        subtitle={t.memShellWelcomeSub}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={t.memSearchPlaceholder}
        isOffline={!isOnline}
        offlineMessage={t.memShellOffline}
      />

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: "24px 16px 110px" }}>

        {/* ── Search results ── */}
        {isSearching && (
          <SearchResultsList
            results={results}
            total={total}
            hasMore={hasMore}
            status={searchStatus}
            error={searchError}
            query={query}
            onSelect={handleSelect}
            onLoadMore={loadMore}
            onClear={resetSearch}
            onRetry={() => setQuery(query)}
            t={t as unknown as Record<string, string>}
          />
        )}

        {/* ── Browse sections (non-search) ── */}
        {!isSearching && (
          <>
            {/* ── Recently Remembered — portrait strip ── */}
            {isOnline && (
              <PortraitStrip
                title={t.memColRecentlyRemembered}
                icon="✨"
                items={collections.recentlyRemembered.items}
                status={collections.recentlyRemembered.status}
                onSelect={handleSelect}
                emptyTitle={t.memShellFeaturedEmpty}
                viewAll={() => setQuery(" ")}
              />
            )}

            {/* ── Enter 3D Sanctuary — subtle CTA ── */}
            {onEnter3D && (
              <EnterSanctuaryCTA
                onEnter={onEnter3D}
                label={t.memShellEnter3D}
                sublabel={t.memShellEnter3DSub}
              />
            )}

            {/* ── Create Memorial — subtle row ── */}
            {onCreateMemorial && (
              <CreateMemorialCTA
                onPress={onCreateMemorial}
                label={t.memShellCreate}
              />
            )}

            {/* ── Offline notice ── */}
            {!isOnline && (
              <GlassPanel style={{ marginBottom: 28 }}>
                <EmptyState
                  icon="📵"
                  title={t.memShellOffline}
                  subtitle={t.memShellOfflineSub}
                />
              </GlassPanel>
            )}

            {isOnline && (
              <>
                <Divider />

                {/* ── Recently Lit — compact portrait strip ── */}
                <PortraitStrip
                  title={t.memColRecentlyLit}
                  icon="🔥"
                  items={collections.recentlyLit.items}
                  status={collections.recentlyLit.status}
                  onSelect={handleSelect}
                  emptyTitle={t.memShellRecentEmpty}
                  compact
                />

                {/* ── Most Visited ── */}
                <PortraitStrip
                  title={t.memColMostVisited}
                  icon="👁"
                  items={collections.mostVisited.items}
                  status={collections.mostVisited.status}
                  onSelect={handleSelect}
                  emptyTitle={t.memShellFeaturedEmpty}
                  compact
                />

                {/* ── Upcoming Yahrzeit ── */}
                <PortraitStrip
                  title={t.memColUpcomingYahrzeit}
                  icon="🕎"
                  items={collections.upcomingYahrzeit.items}
                  status={collections.upcomingYahrzeit.status}
                  onSelect={handleSelect}
                  emptyTitle="No upcoming yahrzeits"
                  compact
                />

                {/* ── Community Picks ── */}
                <PortraitStrip
                  title={t.memColCommunityPicks}
                  icon="✡"
                  items={collections.communityPicks.items}
                  status={collections.communityPicks.status}
                  onSelect={handleSelect}
                  emptyTitle={t.memShellFamilyEmpty}
                  compact
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
