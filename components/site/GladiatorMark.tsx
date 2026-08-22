type HelmetProps = {
  className?: string;
};

/**
 * Gladiator helmet in profile, facing right: a domed cap with a face guard and
 * neck flare, under a crest arcing front-to-back.
 *
 * Profile rather than front-on deliberately — viewed head-on the crest becomes
 * a narrow vertical fin that reads as a stem or handle, whereas in profile it
 * sweeps across the top and the silhouette is unmistakable. The eye slot is an
 * evenodd cut-out so the mark stays transparent on any background.
 */
export function GladiatorHelmet({ className = "" }: HelmetProps) {
  return (
    <svg
      viewBox="5 2 19.5 25.5"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M22 13c-1-5.5-3-8.5-6-8.5-4 0-7.5 4-8.8 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16 9c4.4 0 8 3.6 8 8v4c0 3-1.8 5.3-4.4 5.6h-7.2C9.7 26.3 8 24.3 8 21.6V17c0-4.4 3.6-8 8-8Zm1.4 7.1h4.3v2.4h-4.3v-2.4Z"
      />
    </svg>
  );
}

/** Centered brand lockup for the top banner. */
export function GladiatorMark() {
  return (
    <span className="flex items-center gap-2.5">
      <GladiatorHelmet className="h-8 w-auto shrink-0 text-accent" />
      {/* Negative right margin cancels the trailing letter-space so the
          lockup stays optically centered. */}
      <span className="-mr-[0.2em] text-lg font-extrabold uppercase tracking-[0.2em] text-ink">
        Gladiator
      </span>
    </span>
  );
}
