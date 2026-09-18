import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Branded fallback `og:image` for every route that does not set its own. Drawn
 * rather than a PNG so it stays in sync with the brand colours.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        padding: "0 96px",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 120,
          height: 14,
          backgroundColor: "#faa619",
          borderRadius: 7,
          marginBottom: 48,
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 84,
          fontWeight: 700,
          color: "#58595b",
          lineHeight: 1.1,
        }}
      >
        {SITE_NAME}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 36,
          color: "#6b6c6e",
          marginTop: 32,
          maxWidth: 900,
          lineHeight: 1.35,
        }}
      >
        {SITE_DESCRIPTION}
      </div>
    </div>,
    size,
  );
}
