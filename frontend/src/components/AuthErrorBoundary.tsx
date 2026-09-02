import React from "react";

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Catches runtime errors (including Clerk session expiry side-effects)
 * and shows a graceful recovery screen instead of a blank/broken page.
 */
export class AuthErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#000", color: "#fff" }}
        >
          <div style={{ textAlign: "center", maxWidth: "400px", padding: "24px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "8px", color: "#ef4444" }}>
              Application Error
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#a1a1aa", marginBottom: "24px", fontFamily: "monospace", wordBreak: "break-all" }}>
              {this.state.message || "An unknown error occurred."}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{ padding: "10px 20px", background: "#fff", color: "#000", borderRadius: "8px", fontWeight: 600, border: "none", cursor: "pointer" }}
            >
              Clear Cache & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
