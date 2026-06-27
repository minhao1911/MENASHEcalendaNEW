import { MemorialPlaceholderCard } from "./MemorialPlaceholderCard";

interface LoadingStateProps {
  rows?: number;
  message?: string;
}

export function LoadingState({ rows = 3, message }: LoadingStateProps) {
  return (
    <div>
      {message && (
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.3)",
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          {message}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <MemorialPlaceholderCard key={i} shimmer />
        ))}
      </div>
    </div>
  );
}
