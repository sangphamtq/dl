"use client";

import { useEffect } from "react";

// Bắt lỗi phát sinh ở chính root layout (hiếm). Phải tự bọc <html>/<body> vì
// nó thay thế toàn bộ cây layout gốc.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          color: "#334155",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Trang gặp trục trặc.
          </h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
            Đã có lỗi xảy ra khi tải trang. Vui lòng thử lại.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: "9999px",
              border: "none",
              background: "#0f172a",
              color: "#fff",
              padding: "0.6rem 1.4rem",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
