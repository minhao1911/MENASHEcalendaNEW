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
  EmptyState,
  LoadingState,
} from "../components";
import { SanctuaryWorldPreview } from "../components/SanctuaryWorldPreview";
import type { MemorialWithPerson } from "../types";

interface MemorialSanctuaryPageProps {
  onBack: () => void;
  onCreateMemorial?: () => void;
  onEnter3D?: () => void;
  onSelectMemorial?: (slug: string) => void;
}

// ── Featured Memorial Strip (vertical, full-width) ────────────────────────────

function FeaturedStrip({
  title,
  icon,
  items,
  status,
  onSelect,
  emptyTitle,
  viewAll,
}: {
  title: string;
  icon: string;
  items: MemorialWithPerson[];
  status: string;
  onSelect: (slug: string) => void;
  emptyTitle: string;
  viewAll?: () => void;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionTitle
        title={title}
        icon={icon}
        action={
          viewAll && (
            <button
              onClick={viewAll}
              style={{
                fontSize: 12, color: GOLD, background: "none",
                border: "none", cursor: "pointer", fontWeight: 600,
                padding: "4px 0",
              }}
            >
              See all
            </button>
          )
        }
      />

      {status === "loading" && <LoadingState rows={3} />}

      {status === "success" && items.length === 0 && (
        <GlassPanel>
          <EmptyState icon={icon} title={emptyTitle} />
        </GlassPanel>
      )}

      {status === "success" && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.slice(0, 5).map(m => (
            <MemorialPlaceholderCard
              key={m.id}
              name={m.person.fullName}
              hebrewName={m.person.hebrewName}
              deathDate={m.person.deathDate}
              candleCount={m.candleCount}
              onClick={() => onSelect(m.slug)}
            />
          ))}
        </div>
      )}

      {status === "error" && (
        <GlassPanel>
          <EmptyState icon="⚠️" title="Could not load" />
        </GlassPanel>
      )}
    </div>
  );
}

// ── Horizontal Scroll Strip (secondary sections) ──────────────────────────────

function ScrollStrip({
  title,
  icon,
  items,
  status,
  onSelect,
  emptyTitle,
}: {
  title: string;
  icon: string;
  items: MemorialWithPerson[];
  status: string;
  onSelect: (slug: string) => void;
  emptyTitle: string;
}) {
  if (status === "loading") {
    return (
      <div style={{ marginBottom: 28 }}>
        <SectionTitle title={title} icon={icon} />
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ flexShrink: 0, width: 190 }}>
              <MemorialPlaceholderCard shimmer />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === "error" || (status === "success" && items.length === 0)) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <SectionTitle title={title} icon={icon} />
      <div style={{
        display: "flex",
        overflowX: "auto",
        gap: 10,
        paddingBottom: 4,
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}>
        {items.map(m => (
          <div key={m.id} style={{ flexShrink: 0, width: 210 }}>
            <MemorialPlaceholderCard
              name={m.person.fullName}
              hebrewName={m.person.hebrewName}
              deathDate={m.person.deathDate}
              candleCount={m.candleCount}
              onClick={() => onSelect(m.slug)}
            />
          </div>
        ))}
      </div>
    </div>
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
    results, total, hasMore,
    status: searchStatus, error: searchError,
    query, setQuery, loadMore, reset: resetSearch,
  } = useSearch();

  const collections = useCollections();

  const isSearching = query.trim().length > 0;

  const handleSelectResult = useCallback(
    (slug: string) => { if (onSelectMemorial) onSelectMemorial(slug); },
    [onSelectMemorial],
  );

  return (
    <div style={{
      minHeight: "100%",
      background: "var(--background, #080e1a)",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
      overflowX: "hidden",
    }}>

      {/* ── 1. Header ── */}
      <SanctuaryHeader onBack={onBack} title={t.memTitle} subtitle={t.memSubtitle} />

      {/* ── 2. Hero + Search ── */}
      <SanctuaryHero
        title={t.memShellWelcome}
        subtitle={t.memShellWelcomeSub}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={t.memSearchPlaceholder}
        isOffline={!isOnline}
        offlineMessage={t.memShellOffline}
      />

      <div style={{ flex: 1, padding: "28px 16px 110px" }}>

        {/* ── Search Results ── */}
        {isSearching && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle
              title={searchStatus === "loading" ? t.memShellLoading : t.memShellResults}
              icon="🔍"
              count={searchStatus === "success" ? total : undefined}
              action={
                <button onClick={resetSearch} style={{
                  fontSize: 12, color: GOLD, background: "none",
                  border: "none", cursor: "pointer", fontWeight: 600,
                  padding: "4px 0",
                }}>
                  {t.memClearSearch}
                </button>
              }
            />

            {searchStatus === "loading" && <LoadingState rows={4} />}

            {searchStatus === "error" && (
              <EmptyState icon="⚠️" title={t.memShellSearchError}
                subtitle={searchError?.message}
                action={
                  <button onClick={() => setQuery(query)} style={{
                    fontSize: 13, color: GOLD,
                    background: "rgba(212,168,67,0.1)",
                    border: "1px solid rgba(212,168,67,0.3)",
                    borderRadius: 10, padding: "8px 18px", cursor: "pointer",
                    fontWeight: 600,
                  }}>{t.memShellRetry}</button>
                }
              />
            )}

            {searchStatus === "success" && results.length === 0 && (
              <EmptyState icon="🕊" title={t.memNoResults}
                subtitle={`${t.memShellEmptySearch} "${query}"`} />
            )}

            {searchStatus === "success" && results.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {results.map(m => (
                  <MemorialPlaceholderCard
                    key={m.id}
                    name={m.person.fullName}
                    hebrewName={m.person.hebrewName}
                    deathDate={m.person.deathDate}
                    candleCount={m.candleCount}
                    onClick={() => handleSelectResult(m.slug)}
                  />
                ))}
                {hasMore && (
                  <button onClick={loadMore} style={{
                    padding: "12px", background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, color: "rgba(255,255,255,0.45)",
                    fontSize: 13, cursor: "pointer", fontWeight: 500,
                  }}>
                    {t.memShellLoadMore}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Non-search sections ── */}
        {!isSearching && (
          <>
            {/* ── 3. Featured Memorial: Recently Remembered ── */}
            {isOnline && (
              <FeaturedStrip
                title={t.memColRecentlyRemembered}
                icon="✨"
                items={collections.recentlyRemembered.items}
                status={collections.recentlyRemembered.status}
                onSelect={handleSelectResult}
                emptyTitle={t.memShellFeaturedEmpty}
                viewAll={() => setQuery(" ")}
              />
            )}

            {/* ── 4. Primary Action: Create Memorial ── */}
            {onCreateMemorial && (
              <button
                onClick={onCreateMemorial}
                style={{
                  width: "100%",
                  padding: "18px 20px",
                  borderRadius: 18,
                  background: "linear-gradient(135deg, rgba(212,168,67,0.13) 0%, rgba(212,168,67,0.05) 100%)",
                  border: "1.5px solid rgba(212,168,67,0.32)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  textAlign: "left",
                  marginBottom: 28,
                }}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 15,
                  background: "rgba(212,168,67,0.14)",
                  border: "1px solid rgba(212,168,67,0.28)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  flexShrink: 0,
                }}>✡</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: GOLD, marginBottom: 4 }}>
                    {t.memShellCreate}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(212,168,67,0.52)", lineHeight: 1.4 }}>
                    {t.memShellCreateSub}
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" style={{ flexShrink: 0, opacity: 0.6 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* ── 5. World Preview Viewport ── */}
            {onEnter3D && (
              <SanctuaryWorldPreview
                onEnter={onEnter3D}
                enterLabel={t.memShellEnter3D}
                enterSub={t.memShellEnter3DSub}
              />
            )}

            {/* ── Offline notice ── */}
            {!isOnline && (
              <GlassPanel style={{ marginBottom: 28 }}>
                <EmptyState icon="📵" title={t.memShellOffline} subtitle={t.memShellOfflineSub} />
              </GlassPanel>
            )}

            {/* ── 6. Recent Activity: Most Visited + Recently Lit ── */}
            {isOnline && (
              <>
                <ScrollStrip
                  title={t.memColMostVisited}
                  icon="👁"
                  items={collections.mostVisited.items}
                  status={collections.mostVisited.status}
                  onSelect={handleSelectResult}
                  emptyTitle={t.memShellFeaturedEmpty}
                />

                <ScrollStrip
                  title={t.memColRecentlyLit}
                  icon="🔥"
                  items={collections.recentlyLit.items}
                  status={collections.recentlyLit.status}
                  onSelect={handleSelectResult}
                  emptyTitle={t.memShellRecentEmpty}
                />

                <ScrollStrip
                  title={t.memColUpcomingYahrzeit}
                  icon="🕎"
                  items={collections.upcomingYahrzeit.items}
                  status={collections.upcomingYahrzeit.status}
                  onSelect={handleSelectResult}
                  emptyTitle="No upcoming yahrzeits"
                />

                <ScrollStrip
                  title={t.memColCommunityPicks}
                  icon="✡"
                  items={collections.communityPicks.items}
                  status={collections.communityPicks.status}
                  onSelect={handleSelectResult}
                  emptyTitle={t.memShellFamilyEmpty}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
