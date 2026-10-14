import React, { Component } from "react";

/**
 * Enterprise React Error Boundary
 * Catches JavaScript errors anywhere in child component tree,
 * logs errors, and displays a graceful fallback UI instead of crashing with a blank white screen.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("🚨 [ErrorBoundary Caught]:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleCopyError = () => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.message || error}\nStack: ${error?.stack || ""}\nComponent Stack: ${errorInfo?.componentStack || ""}`;
    navigator.clipboard?.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback({
            error: this.state.error,
            resetErrorBoundary: this.handleReset,
          });
        }
        return this.props.fallback;
      }

      const title = this.props.title || "Something went wrong";
      const isCompact = this.props.compact || false;

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: isCompact ? "24px 16px" : "48px 24px",
            minHeight: isCompact ? "180px" : "320px",
            width: "100%",
            backgroundColor: "#fff",
            borderRadius: "12px",
            border: "1px solid #fee2e2",
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.08)",
            margin: "12px 0",
            fontFamily: "system-ui, -apple-system, sans-serif",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          {/* Warning Icon */}
          <div
            style={{
              width: isCompact ? "40px" : "56px",
              height: isCompact ? "40px" : "56px",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              color: "#dc2626",
            }}
          >
            <svg
              width={isCompact ? "22" : "30"}
              height={isCompact ? "22" : "30"}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h3
            style={{
              fontSize: isCompact ? "18px" : "22px",
              fontWeight: "600",
              color: "#1f2937",
              margin: "0 0 8px 0",
            }}
          >
            {title}
          </h3>

          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              maxWidth: "520px",
              margin: "0 0 20px 0",
              lineHeight: "1.5",
            }}
          >
            An unexpected error occurred while rendering this section. You can retry loading this component, reload the page, or return to the main dashboard.
          </p>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={this.handleReset}
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 18px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#1d4ed8")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#2563eb")}
            >
              Try Again
            </button>

            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "8px 18px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#e5e7eb")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#f3f4f6")}
            >
              Reload Page
            </button>

            <button
              onClick={this.handleGoHome}
              style={{
                backgroundColor: "transparent",
                color: "#6b7280",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Back to Home
            </button>
          </div>

          {/* Collapsible Error Diagnostics */}
          <div style={{ width: "100%", maxWidth: "640px", marginTop: "8px" }}>
            <button
              onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
              style={{
                background: "none",
                border: "none",
                color: "#9ca3af",
                fontSize: "12px",
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              {this.state.showDetails ? "▲ Hide Technical Details" : "▼ Show Technical Details"}
            </button>

            {this.state.showDetails && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  backgroundColor: "#1e293b",
                  color: "#f87171",
                  borderRadius: "8px",
                  textAlign: "left",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  overflowX: "auto",
                  maxHeight: "220px",
                  position: "relative",
                }}
              >
                <button
                  onClick={this.handleCopyError}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "#334155",
                    color: "#f1f5f9",
                    border: "none",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {this.state.copied ? "✓ Copied" : "Copy Error"}
                </button>
                <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                  {this.state.error?.toString()}
                </div>
                <div style={{ color: "#94a3b8", whiteSpace: "pre-wrap" }}>
                  {this.state.errorInfo?.componentStack || this.state.error?.stack}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
