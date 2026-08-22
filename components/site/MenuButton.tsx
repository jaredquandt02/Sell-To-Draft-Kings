/**
 * Action menu trigger. Deliberately unwired for now — it renders as a real
 * button so the drawer can be attached without changing the markup.
 */
export function MenuButton() {
  return (
    <button
      type="button"
      aria-label="Open menu"
      className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-muted"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
        className="h-6 w-6"
      >
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}
