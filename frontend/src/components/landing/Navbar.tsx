import React, { useState, useEffect } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { LogoIcon, LogoText } from "../Logo";

interface NavbarProps {
  onSignIn: () => void;
  onSignUp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignIn }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Platform", href: "#coordination-problem" },
    { label: "Economic Engine", href: "#nic-engine" },
    { label: "5 Invariants", href: "#invariants" },
    { label: "Architecture", href: "#architecture" },
    { label: "Provider Truth", href: "#provider-truth" },
  ];

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled ? "rgba(8, 9, 12, 0.94)" : "rgba(8, 9, 12, 0.75)",
        backdropFilter: "blur(20px)",
        borderBottom: scrolled ? "1px solid #1E2230" : "1px solid rgba(255, 255, 255, 0.04)",
        transition: "all 0.25s ease",
      }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 28px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="#" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <LogoIcon size={32} />
          <LogoText fontSize="1.25rem" />
        </a>

        <nav style={{ display: "flex", alignItems: "center", gap: 24 }} className="hidden md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontFamily: "var(--font-section-heading)",
                fontSize: "13px",
                fontWeight: 600,
                color: "#8E9BB0",
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#00F0FF")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#8E9BB0")}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

          <button
            onClick={onSignIn}
            style={{
              padding: "8px 16px",
              background: "transparent",
              border: "1px solid #1E2230",
              borderRadius: "8px",
              color: "#CBD5E1",
              fontFamily: "var(--font-section-heading)",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            Sign In
          </button>

          <button
            onClick={onSignIn}
            style={{
              padding: "9px 18px",
              background: "linear-gradient(135deg, #00F0FF 0%, #0099FF 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#040711",
              fontFamily: "var(--font-section-heading)",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 16px rgba(0, 240, 255, 0.3)",
            }}
          >
            <span>ENTER ARENA</span>
            <ArrowRight size={13} strokeWidth={2.5} />
          </button>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: "none", border: "none", color: "#8E9BB0", cursor: "pointer", padding: 4 }}
            className="md:hidden"
            aria-label="Toggle Navigation"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div style={{ background: "#0F1117", borderBottom: "1px solid #1E2230", padding: "20px 28px", display: "flex", flexDirection: "column", gap: 16 }} className="md:hidden">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontFamily: "var(--font-section-heading)",
                fontSize: "14px",
                fontWeight: 600,
                color: "#CBD5E1",
                textDecoration: "none",
              }}
            >
              {link.label}
            </a>
          ))}
          <div style={{ display: "flex", gap: 10, paddingTop: 10, borderTop: "1px solid #1E2230" }}>
            <button
              onClick={() => {
                setMobileOpen(false);
                onSignIn();
              }}
              style={{ flex: 1, padding: "10px", borderRadius: 8, background: "#0A0C10", border: "1px solid #1E2230", color: "#FFF", fontSize: 13, fontWeight: 700 }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileOpen(false);
                onSignIn();
              }}
              style={{ flex: 1, padding: "10px", borderRadius: 8, background: "#00F0FF", border: "none", color: "#040711", fontSize: 13, fontWeight: 800 }}
            >
              Enter Arena
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
