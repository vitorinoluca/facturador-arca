import { ImageResponse } from "next/og";

// Genera og:image (y twitter:image, que cae acá si no hay un twitter-image.tsx
// aparte) al buildear — no había ningún asset ni screenshot todavía, así que
// esto arma un placeholder con los mismos colores de marca que el resto del sitio
// (ver --accent/--paper en globals.css) en vez de un banner externo.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "#1b4b43",
          color: "#f4f6f5",
          fontFamily: "sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -1 }}>Facturador ARCA</div>
        <div style={{ fontSize: 34, color: "#c9d6d1", maxWidth: 920 }}>
          Factura C con CAE real para monotributistas
        </div>
      </div>
    ),
    { ...size },
  );
}
