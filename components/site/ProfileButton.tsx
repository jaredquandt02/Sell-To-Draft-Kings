/**
 * Avatar placeholder. Non-interactive until auth exists — rendered as a plain
 * element so it doesn't advertise an action that goes nowhere.
 */
export function ProfileButton() {
  return (
    <div
      aria-hidden="true"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-edge bg-surface text-ink-faint"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        className="h-6 w-6"
      >
        <path d="M12 11.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5zM12 13.25c-3.6 0-6.5 2.24-6.5 5 0 .41.34.75.75.75h11.5c.41 0 .75-.34.75-.75 0-2.76-2.9-5-6.5-5z" />
      </svg>
    </div>
  );
}
