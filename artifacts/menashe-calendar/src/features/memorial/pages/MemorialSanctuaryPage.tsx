import { useCallback } from "react";
import { useLanguage } from "../../../context/LanguageContext";
import { useOnlineStatus } from "../../../hooks/useOnlineStatus";
import { useSearch } from "../hooks/useSearch";
import { GOLD, GOLD_GRAD } from "../../../lib/theme";
import {
  SanctuaryHeader,
  SanctuaryHero,
  SectionTitle,
  GlassPanel,
  MemorialPlaceholderCard,
  EmptyState,
  LoadingState,
} from "../components";

interface MemorialSanctuaryPageProps {
  onBack: () => void;
  onCreateMemorial?: () => void;
  onEnter3D?: () => void;
  onSelectMemorial?: (slug: string) => void;
}

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

  const isSearching = query.trim().length > 0;

  const handleSelectResult = useCallback(
    (slug: string) => {
      if (onSelectMemorial) onSelectMemorial(slug);
    },
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
      {/* ── Header ── */}
      <SanctuaryHeader
        onBack={onBack}
        title={t.memTitle}
        subtitle={t.memSubtitle}
      />

      {/* ── Hero + Search ── */}
      <SanctuaryHero
        title={t.memShellWelcome}
        subtitle={t.memShellWelcomeSub}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={t.memSearchPlaceholder}
        isOffline={!isOnline}
        offlineMessage={t.memShellOffline}
      />

      <div style={{ flex: 1, padding: "20px 16px 100px" }}>

        {/* ── Search results ── */}
        {isSearching && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle
              title={searchStatus === "loading" ? t.memShellLoading : t.memShellResults}
              icon="🔍"
              count={searchStatus === "success" ? total : undefined}
              action={
                <button
                  onClick={resetSearch}
                  style={{
                    fontSize: 11,
                    color: GOLD,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {t.memClearSearch}
                </button>
              }
            />

            {searchStatus === "loading" && <LoadingState rows={3} />}

            {searchStatus === "error" && (
              <EmptyState
                icon="⚠️"
                title={t.memShellSearchError}
                subtitle={searchError?.message}
                action={
                  <button
                    onClick={() => setQuery(query)}
                    style={{
                      fontSize: 12,
                      color: GOLD,
                      background: "rgba(212,168,67,0.1)",
                      border: "1px solid rgba(212,168,67,0.3)",
                      borderRadius: 8,
                      padding: "6px 14px",
                      cursor: "pointer",
                    }}
                  >
                    {t.memShellRetry}
                  </button>
                }
              />
            )}

            {searchStatus === "success" && results.length === 0 && (
              <EmptyState
                icon="🕊"
                title={t.memNoResults}
                subtitle={`${t.memShellEmptySearch} "${query}"`}
              />
            )}

            {searchStatus === "success" && results.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {results.map((m) => (
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
                  <button
                    onClick={loadMore}
                    style={{
                      padding: "10px",
                      background: "none",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
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
            {/* ── Enter 3D Sanctuary CTA ── */}
            {onEnter3D && (
              <GlassPanel
                gold
                onClick={onEnter3D}
                style={{ marginBottom: 24, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: GOLD_GRAD,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      flexShrink: 0,
                    }}
                  >
                    🏔
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: GOLD, marginBottom: 3 }}>
                      {t.memShellEnter3D}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(212,168,67,0.6)" }}>
                      {t.memShellEnter3DSub}
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </GlassPanel>
            )}

            {/* ── Featured Memorials ── */}
            <div style={{ marginBottom: 28 }}>
              <SectionTitle
                title={t.memShellFeatured}
                icon="✨"
                action={
                  <button
                    style={{
                      fontSize: 11, color: GOLD, background: "none",
                      border: "none", cursor: "pointer", fontWeight: 600,
                    }}
                    onClick={() => setQuery(" ")}
                  >
                    {t.memShellViewAll}
                  </button>
                }
              />
              {!isOnline ? (
                <EmptyState icon="📵" title={t.memShellOffline} subtitle={t.memShellOfflineSub} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Three featured placeholder cards */}
                  {[
                    { label: t.memShellFeaturedEmpty },
                  ].map((_, i) => (
                    <MemorialPlaceholderCard
                      key={i}
                      shimmer={false}
                      name={undefined}
                      onClick={undefined}
                    />
                  ))}
                  <EmptyState
                    icon="🕯"
                    title={t.memShellFeaturedEmpty}
                    subtitle={t.memShellFeaturedEmptySub}
                  />
                </div>
              )}
            </div>

            {/* ── Recently Lit Candles ── */}
            <div style={{ marginBottom: 28 }}>
              <SectionTitle title={t.memShellRecentCandles} icon="🔥" />
              {!isOnline ? (
                <EmptyState icon="📵" title={t.memShellOffline} />
              ) : (
                <GlassPanel>
                  <EmptyState
                    icon="🕯"
                    title={t.memShellRecentEmpty}
                    subtitle={t.memShellRecentEmptySub}
                  />
                </GlassPanel>
              )}
            </div>

            {/* ── Family Memorials ── */}
            <div style={{ marginBottom: 28 }}>
              <SectionTitle title={t.memShellFamilyMemorials} icon="👨‍👩‍👧" />
              {!isOnline ? (
                <EmptyState icon="📵" title={t.memShellOffline} />
              ) : (
                <GlassPanel>
                  <EmptyState
                    icon="🏠"
                    title={t.memShellFamilyEmpty}
                    subtitle={t.memShellFamilyEmptySub}
                    action={
                      onCreateMemorial && (
                        <button
                          onClick={onCreateMemorial}
                          style={{
                            fontSize: 12,
                            color: GOLD,
                            background: "rgba(212,168,67,0.1)",
                            border: "1px solid rgba(212,168,67,0.3)",
                            borderRadius: 8,
                            padding: "7px 16px",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          {t.memShellCreate}
                        </button>
                      )
                    }
                  />
                </GlassPanel>
              )}
            </div>

            {/* ── Create Memorial CTA ── */}
            {onCreateMemorial && (
              <button
                onClick={onCreateMemorial}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(212,168,67,0.14) 0%, rgba(212,168,67,0.06) 100%)",
                  border: "1.5px solid rgba(212,168,67,0.35)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 13,
                    background: "rgba(212,168,67,0.15)",
                    border: "1px solid rgba(212,168,67,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  ✡
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: GOLD, marginBottom: 3 }}>
                    {t.memShellCreate}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(212,168,67,0.55)" }}>
                    {t.memShellCreateSub}
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" style={{ flexShrink: 0, opacity: 0.7 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
