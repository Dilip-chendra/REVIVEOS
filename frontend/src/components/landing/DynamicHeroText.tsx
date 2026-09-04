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
            opacity: 0.35;
            transform: scale(0.98);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.02);
          }
        }
        @keyframes reviveCapsuleGlow {
          0%, 100% {
            border-color: rgba(0, 240, 255, 0.32);
            box-shadow: inset 0 0 14px rgba(0, 240, 255, 0.1), 0 0 20px rgba(0, 240, 255, 0.15);
          }
          50% {
            border-color: rgba(0, 240, 255, 0.55);
            box-shadow: inset 0 0 20px rgba(0, 240, 255, 0.18), 0 0 32px rgba(0, 240, 255, 0.3);
          }
        }
        .revive-typewriter-cursor {
          animation: reviveCursorBlink 1.05s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .revive-cursor-typing {
          opacity: 1 !important;
          animation: none !important;
        }
        .revive-action-capsule {
          animation: reviveCapsuleGlow 4s ease-in-out infinite;
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
          .revive-action-capsule {
            padding: 0.04em 0.32em !important;
            border-radius: 8px !important;
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
            row-gap: 10px !important;
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

        {/* Line 2: Decision OS + Action Capsule */}
        <div
          className="revive-hero-line2"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: isLeftAligned ? "flex-start" : "center",
            flexWrap: "nowrap",
            gap: "0.32em",
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
              display: "inline-flex",
              alignItems: "center",
              gap: "0.24em",
            }}
          >
            <span
              style={{
                color: "#F1F5F9",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              ReviveOS
            </span>
            <span>decides when to</span>
          </span>

          {/* Dynamic Action Capsule with Zero-CLS Sizer */}
          <span
            className="revive-action-capsule"
            style={{
              display: "inline-grid",
              gridTemplateColumns: "1fr",
              alignItems: "center",
              justifyItems: "center",
              position: "relative",
              verticalAlign: "middle",
              background: "linear-gradient(135deg, rgba(0, 240, 255, 0.09) 0%, rgba(56, 189, 248, 0.03) 100%)",
              border: "1px solid rgba(0, 240, 255, 0.35)",
              borderRadius: "10px",
              padding: "0.06em 0.44em",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "inset 0 0 16px rgba(0, 240, 255, 0.12), 0 0 24px rgba(0, 240, 255, 0.18)",
            }}
          >
            {/* Ambient Cyan Glow behind capsule */}
            <div
              style={{
                position: "absolute",
                inset: "-25%",
                background: "radial-gradient(ellipse at center, rgba(0, 240, 255, 0.2) 0%, rgba(56, 189, 248, 0.04) 50%, transparent 75%)",
                filter: "blur(20px)",
                pointerEvents: "none",
                zIndex: 0,
                animation: "reviveAmbientPulse 4s ease-in-out infinite",
              }}
            />

            {/* 1. Sizer Element: Invisible, holds the exact dimensions of the longest word ("Escalate.") to guarantee zero layout shift (CLS = 0.000) */}
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
                paddingRight: "8px", // Reserve space for cursor
              }}
            >
              {longestPhrase}
            </span>

            {/* 2. Active Animated Word with Radiant Cyber Gradient */}
            <span
              style={{
                gridArea: "1 / 1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                whiteSpace: "nowrap",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, #00F0FF 0%, #38BDF8 55%, #60A5FA 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 18px rgba(0, 240, 255, 0.5))",
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
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
                    height: "0.82em",
                    marginLeft: "4px",
                    borderRadius: "2px",
                    background: "#00F0FF",
                    boxShadow: "0 0 10px #00F0FF, 0 0 20px rgba(0, 240, 255, 0.7)",
                    verticalAlign: "baseline",
                    transform: "translateY(0.04em)",
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
