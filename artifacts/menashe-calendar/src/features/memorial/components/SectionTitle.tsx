import { GOLD } from "../../../lib/theme";

interface SectionTitleProps {
  title: string;
  action?: React.ReactNode;
  icon?: string;
  count?: number;
}

export function SectionTitle({ title, action, icon, count }: SectionTitleProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        {typeof count === "number" && count > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: GOLD,
              background: "rgba(212,168,67,0.12)",
              border: "1px solid rgba(212,168,67,0.25)",
              borderRadius: 6,
              padding: "1px 6px",
            }}
          >
            {count}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
