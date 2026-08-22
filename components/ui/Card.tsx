type CardProps = {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
};

export function Card({
  children,
  className = "",
  interactive = false,
}: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-edge bg-canvas p-5 shadow-card",
        interactive
          ? "transition-shadow hover:border-edge-strong hover:shadow-lift"
          : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
