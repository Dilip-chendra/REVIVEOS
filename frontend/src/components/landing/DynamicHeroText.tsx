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
  "Retry.",
  "Reroute.",
  "Pause.",
  "Escalate.",
  "Recover.",
];

export const DynamicHeroText: React.FC<DynamicHeroTextProps> = ({
  staticPrefix = "Razorpay Moves the Money.",
  staticSubPrefix = "ReviveOS Decides When To",
  phrases = DEFAULT_PHRASES,
  typingSpeed = 52,
  deletingSpeed = 28,
  pauseDuration = 2400,
  pauseBeforeNext = 340,
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

  // Find the longest phrase for the invisible sizer to prevent ANY layout shift (CLS = 0.000)
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

          const jitter = (Math.random() - 0.5) * 8;
          timeoutRef.current = setTimeout(handleTick, Math.max(16, deletingSpeed + jitter));
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

          const jitter = (Math.random() - 0.5) * 16;
          timeoutRef.current = setTimeout(handleTick, Math.max(26, typingSpeed + jitter));
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
  const accessibleText = `${staticPrefix} ${staticSubPrefix} ${phrases[0] || ""}`;

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
            opacity: 0.28;
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
          font-size: clamp(2.05rem, 4.3vw, 3.8rem);
          line-height: 1.22;
        }
        @media (max-width: 768px) {
          .revive-hero-headline {
            font-size: clamp(1.5rem, 5.2vw, 2.25rem) !important;
            line-height: 1.28 !important;
          }
        }
        @media (max-width: 520px) {
          .revive-hero-headline {
            font-size: clamp(1.25rem, 5.0vw, 1.6rem) !important;
            line-height: 1.34 !important;
          }
          .revive-hero-line2 {
            flex-wrap: wrap !important;
            justify-content: center !important;
            row-gap: 8px !important;
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
          letterSpacing: "-0.025em",
          maxWidth: "1200px",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: isLeftAligned ? "flex-start" : "center",
          textAlign: isLeftAligned ? "left" : "center",
        }}
      >
        {/* Line 1: Primary Execution Rail */}
        <div
          style={{
            color: "#FFFFFF",
            display: "block",
            whiteSpace: "nowrap",
            marginBottom: "0.18em",
            textShadow: "0 2px 24px rgba(255, 255, 255, 0.12)",
          }}
        >
          {staticPrefix}
        </div>

        {/* Line 2: Decision OS + Natural Seamless Dynamic Word */}
        <div
          className="revive-hero-line2"
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            justifyContent: isLeftAligned ? "flex-start" : "center",
            flexWrap: "nowrap",
            position: "relative",
            width: "auto",
          }}
        >
          {/* Static Sub-prefix ("ReviveOS decides when to") */}
          <span
            style={{
              color: "#94A3B8",
              fontWeight: 700,
              whiteSpace: "nowrap",
              marginRight: "0.3em",
              display: "inline-flex",
              alignItems: "baseline",
              gap: "0.24em",
            }}
          >
            <span
              style={{
                fontWeight: 800,
                letterSpacing: "-0.02em",
                display: "inline-flex",
                alignItems: "baseline",
              }}
            >
              <span style={{ color: "#F1F5F9" }}>Revive</span>
              <span
                style={{
                  background: "linear-gradient(135deg, #6366F1 0%, #38BDF8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginLeft: "1px",
                  filter: "drop-shadow(0 0 12px rgba(56, 189, 248, 0.4))",
                }}
              >
                OS
              </span>
            </span>
            <span>decides when to</span>
          </span>

          {/* Dynamic Action Slot with Zero-CLS Sizer (No Box, seamless page canvas) */}
          <span
            style={{
              display: "inline-grid",
              gridTemplateColumns: "1fr",
              alignItems: "baseline",
              justifyItems: "start",
              position: "relative",
              verticalAlign: "baseline",
              textAlign: "left",
            }}
          >
            {/* Ambient Cyan Radial Atmosphere */}
            <div
              style={{
                position: "absolute",
                inset: "-25%",
                background: "radial-gradient(ellipse at center, rgba(0, 240, 255, 0.18) 0%, rgba(56, 189, 248, 0.03) 50%, transparent 75%)",
                filter: "blur(22px)",
                pointerEvents: "none",
                zIndex: 0,
                animation: "reviveAmbientPulse 4s ease-in-out infinite",
              }}
            />

            {/* 1. Sizer Element: Invisible, holds the exact dimensions of the longest word ("Escalate.") plus cursor width to guarantee zero layout shift (CLS = 0.000) */}
            <span
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
                paddingRight: "14px", // Reserve space for 5px cursor + margin
              }}
            >
              {longestPhrase}
            </span>

            {/* 2. Active Animated Word with Radiant Cyber Gradient + Bold Pipe Cursor */}
            <span
              style={{
                gridArea: "1 / 1",
                display: "inline-flex",
                alignItems: "baseline",
                whiteSpace: "nowrap",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, #00F0FF 0%, #38BDF8 55%, #60A5FA 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 20px rgba(0, 240, 255, 0.48))",
                  fontWeight: 800,
                  letterSpacing: "-0.015em",
                }}
              >
                {displayedText}
              </span>

              {/* Bold Photonic Pipe / Vertical Bar Cursor */}
              {!isReducedMotion && (
                <span
                  className={`revive-typewriter-cursor ${!isPaused ? "revive-cursor-typing" : ""}`}
                  style={{
                    display: "inline-block",
                    width: "5px",
                    height: "0.92em",
                    marginLeft: "6px",
                    borderRadius: "2.5px",
                    background: "linear-gradient(180deg, #00F0FF 0%, #38BDF8 100%)",
                    boxShadow: "0 0 8px #00F0FF, 0 0 18px rgba(0, 240, 255, 0.75), 0 0 32px rgba(0, 240, 255, 0.45)",
                    verticalAlign: "baseline",
                    transform: "translateY(0.06em)",
                    flexShrink: 0,
                  }}
                />
              )}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default DynamicHeroText;
