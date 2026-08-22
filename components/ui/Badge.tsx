type Tone = "accent" | "neutral" | "outline";

const TONES: Record<Tone, string> = {
  accent: "bg-accent-muted text-accent-strong",
  neutral: "bg-surface-raised text-ink-muted",
  outline: "border border-edge-strong text-ink-muted",
};

type BadgeProps = {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        TONES[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
