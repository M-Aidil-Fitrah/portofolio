import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Muhammad Aidil Fitrah — Software Engineer & Web Developer";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0a0a0a",
          color: "#e8e6e1",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#7a7a72",
          }}
        >
          Banda Aceh, ID — Software Engineer
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: -2,
            marginTop: 24,
          }}
        >
          Muhammad Aidil Fitrah
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            marginTop: 32,
            color: "#d9ff3d",
          }}
        >
          Web Development &amp; Machine Learning
        </div>
      </div>
    ),
    { ...size }
  );
}
