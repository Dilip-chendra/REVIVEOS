import React, { useState, useEffect, useRef, useMemo } from "react";

export interface DynamicHeroTextProps {
  staticPrefix?: string;
  staticSubPrefix?: string;
  phrases?: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  pauseBeforeNext?: number;
  reducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_PHRASES = [
  "Customer Trust",
  "Incremental Revenue",
  "Recovery Capital",
  "Safe Automation",
  "Profitability",
  "Payment Intelligence",
];

export const DynamicHeroText: React.FC<DynamicHeroTextProps> = ({
  staticPrefix = "Recover Revenue.",
  staticSubPrefix = "Preserve ",
  phrases = DEFAULT_PHRASES,
  typingSpeed = 55,
  deletingSpeed = 30,
  pauseDuration = 2500,
  pauseBeforeNext = 380,
  reducedMotion: propReducedMotion,
  className = "",
  style = {},
}) => {
  // Respect system prefers-reduced-motion
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemReducedMotion(e.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const isReducedMotion = propReducedMotion ?? systemReducedMotion;

  // Find the longest phrase for the invisible sizer to prevent ANY layout shift (CLS = 0)
  const longestPhrase = useMemo(() => {
    return phrases.reduce((longest, current) => (current.length > longest.length ? current : longest), "");
  }, [phrases]);

  // State: starts fully typed with the first phrase for instant first paint
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState(phrases[0] || "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(true);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isReducedMotion) {
      setDisplayedText(phrases[0] || "");
      return;
    }

    const currentPhrase = phrases[phraseIndex] || "";

    const handleTick = () => {
      if (isPaused) {
        // Paused state
        if (displayedText.length === currentPhrase.length && !isDeleting) {
          // Finished reading pause -> start deleting
          setIsPaused(false);
          setIsDeleting(true);
        } else if (displayedText.length === 0 && isDeleting) {
          // Finished empty pause -> move to next phrase & start typing
          setIsDeleting(false);
          setIsPaused(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
        return;
      }

      if (isDeleting) {
        if (displayedText.length > 0) {
          const nextText = currentPhrase.slice(0, displayedText.length - 1);
          setDisplayedText(nextText);

          if (nextText.length === 0) {
            setIsPaused(true);
            timeoutRef.current = setTimeout(handleTick, pauseBeforeNext);
            return;
          }

          const jitter = (Math.random() - 0.5) * 10;
          timeoutRef.current = setTimeout(handleTick, Math.max(15, deletingSpeed + jitter));
        }
      } else {
        // Typing
        if (displayedText.length < currentPhrase.length) {
          const nextText = currentPhrase.slice(0, displayedText.length + 1);
          setDisplayedText(nextText);

          if (nextText.length === currentPhrase.length) {
            setIsPaused(true);
            timeoutRef.current = setTimeout(handleTick, pauseDuration);
            return;
          }

          const jitter = (Math.random() - 0.5) * 20;
          timeoutRef.current = setTimeout(handleTick, Math.max(25, typingSpeed + jitter));
        }
      }
    };

    if (isPaused) {
      const delay = displayedText.length === 0 ? pauseBeforeNext : pauseDuration;
      timeoutRef.current = setTimeout(handleTick, delay);
    } else {
      const delay = isDeleting ? deletingSpeed : typingSpeed;
      timeoutRef.current = setTimeout(handleTick, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    displayedText,
    isDeleting,
    isPaused,
    phraseIndex,
    phrases,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    pauseBeforeNext,
    isReducedMotion,
  ]);

  // Accessible full text for screen readers
  const accessibleText = `${staticPrefix} ${staticSubPrefix}${phrases[0] || ""}`;

  return (
    <div
      className={`relative select-none ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        width: "100%",
        ...style,
      }}
    >
      <style>{`
        @keyframes reviveCursorBlink {
          0%, 45% {
            opacity: 1;
          }
          50%, 95% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes reviveAmbientPulse {
          0%, 100% {
            opacity: 0.35;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.02);
          }
        }
        .revive-typewriter-cursor {
          animation: reviveCursorBlink 1.05s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .revive-cursor-typing {
          opacity: 1 !important;
          animation: none !important;
        }
      `}</style>

      {/* Screen Reader Accessible Headline */}
      <h1
        className="sr-only"
        tabIndex={-1}
        aria-label={accessibleText}
      >
        {accessibleText}
      </h1>

      {/* Visual Animated Headline */}
      <div
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-display, var(--font-hero-display, sans-serif))",
          fontSize: "clamp(2.35rem, 5.4vw, 4.4rem)",
          fontWeight: 900,
          lineHeight: 1.08,
          letterSpacing: "-0.035em",
          maxWidth: "1040px",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Line 1: Primary Punchline */}
        <span
          style={{
            color: "#EEF1F8",
            display: "block",
            whiteSpace: "nowrap",
          }}
        >
          {staticPrefix}
        </span>

        {/* Line 2: Prefix + Stable Dynamic Slot */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            justifyContent: "center",
            flexWrap: "wrap",
            rowGap: "4px",
            marginTop: "6px",
            position: "relative",
          }}
        >
          {/* Static Sub-prefix ("Preserve ") */}
          <span
            style={{
              color: "#8E9BB0",
              marginRight: "0.26em",
              fontWeight: 800,
            }}
          >
            {staticSubPrefix}
          </span>

          {/* Dynamic Phrase Slot with Zero-CLS Grid Sizer */}
          <span
            style={{
              display: "inline-grid",
              gridTemplateColumns: "1fr",
              verticalAlign: "baseline",
              textAlign: "left",
              position: "relative",
            }}
          >
            {/* Ambient Cyan Glow behind rotating word */}
            <div
              style={{
                position: "absolute",
                inset: "-20%",
                background: "radial-gradient(ellipse at center, rgba(0, 240, 255, 0.16) 0%, rgba(56, 189, 248, 0.04) 50%, transparent 75%)",
                filter: "blur(20px)",
                pointerEvents: "none",
                zIndex: 0,
                animation: "reviveAmbientPulse 4s ease-in-out infinite",
              }}
            />

            {/* 1. Sizer Element: Invisible, holds the width of the longest phrase to prevent layout shift */}
            <span
              style={{
                gridArea: "1 / 1",
                visibility: "hidden",
                pointerEvents: "none",
                userSelect: "none",
                whiteSpace: "nowrap",
                opacity: 0,
                height: 0,
                overflow: "hidden",
                fontWeight: 900,
              }}
            >
              {longestPhrase}
              {/* Extra spacing for cursor width to guarantee zero shift */}
              <span style={{ display: "inline-block", width: "8px" }} />
            </span>

            {/* 2. Active Animated Text with Gradient */}
            <span
              style={{
                gridArea: "1 / 1",
                display: "inline-flex",
                alignItems: "baseline",
                whiteSpace: "nowrap",
                textAlign: "left",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, #00F0FF 0%, #38BDF8 50%, #60A5FA 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 24px rgba(0, 240, 255, 0.32))",
                  fontWeight: 900,
                }}
              >
                {displayedText}
              </span>

              {/* Minimal Vertical Accent Cursor */}
              {!isReducedMotion && (
                <span
                  className={`revive-typewriter-cursor ${!isPaused ? "revive-cursor-typing" : ""}`}
                  style={{
                    display: "inline-block",
                    width: "2.5px",
                    height: "0.85em",
                    marginLeft: "4px",
                    borderRadius: "1.5px",
                    background: "#00F0FF",
                    boxShadow: "0 0 8px #00F0FF, 0 0 16px rgba(0, 240, 255, 0.5)",
                    verticalAlign: "baseline",
                    transform: "translateY(0.06em)",
                    flexShrink: 0,
                  }}
                />
              )}
            </span>
          </span>
        </span>
      </div>
    </div>
  );
};

export default DynamicHeroText;
