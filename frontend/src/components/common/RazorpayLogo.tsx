import React from "react";

export interface RazorpayLogoProps {
  type?: "full" | "glyph";
  variant?: "white" | "original";
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  glow?: boolean;
}

export const RazorpayLogo: React.FC<RazorpayLogoProps> = ({
  type = "full",
  variant = "white",
  height = "1.1em",
  className = "",
  style = {},
  alt = "Razorpay",
  glow = false,
}) => {
  let imgSrc = "/razorpay-logo-white.png";
  if (type === "glyph") {
    imgSrc = variant === "original" ? "/razorpay-glyph.png" : "/razorpay-glyph-white.png";
  } else {
    imgSrc = variant === "original" ? "/razorpay-logo.png" : "/razorpay-logo-white.png";
  }

  return (
    <span
      className={`inline-flex items-center align-middle select-none ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
        lineHeight: 1,
        ...style,
      }}
    >
      <img
        src={imgSrc}
        alt={alt}
        style={{
          height: typeof height === "number" ? `${height}px` : height,
          width: "auto",
          maxWidth: "none",
          objectFit: "contain",
          display: "inline-block",
          verticalAlign: "middle",
          filter: glow ? "drop-shadow(0 0 14px rgba(51, 149, 255, 0.45))" : undefined,
        }}
        loading="eager"
        decoding="async"
      />
    </span>
  );
};

export default RazorpayLogo;
