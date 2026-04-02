import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "#f8fafc",
            color: "#0f172a",
            fontFamily: "'Be Vietnam Pro','Segoe UI',sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "720px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
              padding: "24px",
            }}
          >
            <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>
              Ứng dụng gặp lỗi khi hiển thị
            </div>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Trang vừa rồi không render được. Bạn hãy tải lại trang, hoặc mở DevTools Console để xem lỗi chi tiết.
            </p>
            {this.state.error ? (
              <pre
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#0f172a",
                  color: "#e2e8f0",
                  overflowX: "auto",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {String(this.state.error?.message || this.state.error)}
              </pre>
            ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
