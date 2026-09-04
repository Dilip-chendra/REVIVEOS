import React, { useState, useEffect, useRef, useMemo } from "react";

export interface DynamicHeroTextProps {
  staticPrefix?: string;
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
  "Without Customer Friction.",
  "Without Margin Erosion.",
  "Without Agent Collisions.",
  "Without Blind Retries.",
  "With Mathematical Safety.",
];

export const DynamicHeroText: React.FC<DynamicHeroTextProps> = ({
  staticPrefix = "Recover Failed Revenue.",
  phrases = DEFAULT_PHRASES,
  typingSpeed = 46,
  deletingSpeed = 24,
  pauseDuration = 2700,
  pauseBeforeNext = 360,
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

  // Determine alignment preferences from style
  const isLeftAligned = style.textAlign === "left" || style.alignItems === "flex-start";

  // Accessible full text for screen readers
  const accessibleText = `${staticPrefix} ${phrases[0] || ""}`;

  return (
    <div
      className={`relative select-none ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isLeftAligned ? "flex-start" : "center",
        textAlign: isLeftAligned ? "left" : "center",
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
            opacity: 0.3;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.65;
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
        .revive-hero-headline {
          font-size: clamp(2.1rem, 4.4vw, 3.8rem);
          line-height: 1.2;
        }
        @media (max-width: 768px) {
          .revive-hero-headline {
            font-size: clamp(1.6rem, 5.8vw, 2.35rem) !important;
            line-height: 1.25 !important;
          }
        }
        @media (max-width: 480px) {
          .revive-hero-headline {
            font-size: clamp(1.35rem, 5.2vw, 1.7rem) !important;
            line-height: 1.26 !important;
          }
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
        className="revive-hero-headline"
        style={{
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          maxWidth: "1150px",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: isLeftAligned ? "flex-start" : "center",
          textAlign: isLeftAligned ? "left" : "center",
        }}
      >
        {/* Line 1: Primary Capability */}
        <div
          style={{
            color: "#FFFFFF",
            display: "block",
            whiteSpace: "nowrap",
            marginBottom: "0.14em",
          }}
        >
          {staticPrefix}
        </div>

        {/* Line 2: Full-Clause Dynamic Value Statement */}
        <div
          className="revive-hero-line2"
          style={{
            display: "inline-grid",
            gridTemplateColumns: "1fr",
            alignItems: "baseline",
            justifyItems: isLeftAligned ? "start" : "center",
            textAlign: isLeftAligned ? "left" : "center",
            position: "relative",
            width: "100%",
            maxWidth: "100%",
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            style={{
              position: "absolute",
              inset: "-30%",
              background: "radial-gradient(ellipse at center, rgba(0, 240, 255, 0.16) 0%, rgba(56, 189, 248, 0.04) 50%, transparent 75%)",
              filter: "blur(28px)",
              pointerEvents: "none",
              zIndex: 0,
              animation: "reviveAmbientPulse 4s ease-in-out infinite",
            }}
          />

          {/* 1. Sizer Element: Invisible, holds the exact dimensions of the longest phrase to guarantee zero layout shift (CLS = 0.000) */}
          <div
            aria-hidden="true"
            style={{
              gridArea: "1 / 1",
              visibility: "hidden",
              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
              opacity: 0,
              height: "auto",
              fontWeight: 800,
              paddingRight: "10px", // Reserve space for cursor
            }}
          >
            {longestPhrase}
          </div>

          {/* 2. Active Animated Text with Gradient */}
          <div
            style={{
              gridArea: "1 / 1",
              display: "inline-flex",
              alignItems: "baseline",
              justifyContent: isLeftAligned ? "flex-start" : "center",
              whiteSpace: "nowrap",
              zIndex: 1,
            }}
          >
            <span
              style={{
                background: "linear-gradient(135deg, #00F0FF 0%, #38BDF8 60%, #60A5FA 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 20px rgba(0, 240, 255, 0.38))",
                fontWeight: 800,
              }}
            >
              {displayedText}
            </span>

            {/* Minimal Glowing Accent Cursor */}
            {!isReducedMotion && (
              <span
                className={`revive-typewriter-cursor ${!isPaused ? "revive-cursor-typing" : ""}`}
                style={{
                  display: "inline-block",
                  width: "3px",
                  height: "0.85em",
                  marginLeft: "5px",
                  borderRadius: "2px",
                  background: "#00F0FF",
                  boxShadow: "0 0 10px #00F0FF, 0 0 22px rgba(0, 240, 255, 0.6)",
                  verticalAlign: "baseline",
                  transform: "translateY(0.06em)",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicHeroText;
