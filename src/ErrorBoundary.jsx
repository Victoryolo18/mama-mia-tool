import { Component } from "react";
import { reportError } from "./errorLog.js";

const C = { cream: "#FAF7F2", burgundy: "#5C2818", cappuccino: "#A88968", gold: "#C9A84C", ink: "#1C1008" };

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    reportError("react_render", error, { componentStack: info?.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 16, padding: 24, textAlign: "center",
          fontFamily: "sans-serif", background: C.cream, color: C.ink,
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.burgundy }}>Etwas ist schiefgelaufen.</div>
          <div style={{ fontSize: 14, color: C.cappuccino, maxWidth: 400 }}>
            Bitte laden Sie die Seite neu. Falls das Problem bestehen bleibt, kontaktieren Sie uns gerne
            direkt unter <a href="tel:01739344723" style={{ color: C.burgundy }}>0173 9344723</a>.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: C.burgundy, color: C.gold, border: "none", padding: "12px 24px",
              borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Seite neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
