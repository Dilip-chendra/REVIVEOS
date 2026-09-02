/**
 * ReviveOS — Global React Error Boundary
 *
 * Wraps each major page/section. When an unhandled React rendering error
 * occurs (API data shape mismatch, undefined property access, etc.),
 * this shows a user-friendly recovery UI instead of a blank white screen.
 *
 * Usage:
 *   <ErrorBoundary section="Dashboard">
 *     <Dashboard />
 *   </ErrorBoundary>
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Short label for the section (used in the error display) */
  section?: string;
  /** Optional callback when user clicks retry */
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
  errorId: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate a short error ID for support reference
    const errorId = `ERR-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    return {
      hasError: true,
      errorMessage: error?.message || "An unexpected rendering error occurred.",
      errorId,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console only — never send secrets or tokens to external logging
    console.error(`[ReviveOS Error Boundary] Section: ${this.props.section || "unknown"}`, {
      error: error?.message,
      component: info.componentStack?.slice(0, 500),
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "", errorId: "" });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const section = this.props.section || "this section";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "320px",
          padding: "40px 24px",
          gap: 20,
          textAlign: "center",
          background: "rgba(239, 68, 68, 0.04)",
          border: "1px solid rgba(239, 68, 68, 0.18)",
          borderRadius: "16px",
          margin: "16px",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <AlertTriangle size={24} color="#EF4444" />
        </div>

        {/* Title */}
        <div>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              color: "#F8FAFC",
              marginBottom: 6,
            }}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)} encountered an error
          </h3>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#94A3B8",
              lineHeight: 1.5,
              maxWidth: 420,
            }}
          >
            ReviveOS could not render this section. Your data and connections are not affected.
            This is a display error only.
          </p>
        </div>

        {/* Safe error detail (no raw traceback) */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid #1E293B",
            borderRadius: "8px",
            padding: "10px 16px",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            color: "#64748B",
            maxWidth: 420,
            width: "100%",
            textAlign: "left",
            wordBreak: "break-all",
          }}
        >
          <span style={{ color: "#475569" }}>Ref: </span>
          <span style={{ color: "#94A3B8" }}>{this.state.errorId}</span>
          {this.state.errorMessage && (
            <>
              <br />
              <span style={{ color: "#475569" }}>Detail: </span>
              <span style={{ color: "#94A3B8" }}>
                {this.state.errorMessage.slice(0, 120)}
              </span>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={this.handleRetry}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg, #0284C7, #0369A1)",
              border: "none",
              borderRadius: "8px",
              padding: "9px 18px",
              color: "#FFF",
              fontSize: "0.8125rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
            }}
          >
            <RefreshCw size={13} />
            <span>Retry</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "9px 18px",
              color: "#94A3B8",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Home size={13} />
            <span>Reload Page</span>
          </button>
        </div>

        <p style={{ fontSize: "0.6875rem", color: "#475569" }}>
          Error reference: {this.state.errorId} · Your data is safe · No financial action was taken
        </p>
      </div>
    );
  }
}
