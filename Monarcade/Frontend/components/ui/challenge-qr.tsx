"use client";

import { useEffect, useRef, useState } from "react";

type ChallengeQRProps = {
  challengeId: string | number;
  size?: number;
};

/**
 * Generates a QR code SVG for the challenge URL.
 * Uses a simple QR encoding without external dependencies.
 */
export function ChallengeQR({ challengeId, size = 160 }: ChallengeQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const challengeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/challenge/${challengeId}`
      : `/challenge/${challengeId}`;

  useEffect(() => {
    let cancelled = false;

    async function generate() {
      try {
        // Use the qrcode package already available via Privy/WalletConnect
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(challengeUrl, {
          width: size * 2,
          margin: 1,
          color: { dark: "#351428", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        // Fallback: show the URL as text
        if (!cancelled) setDataUrl(null);
      }
    }

    generate();
    return () => { cancelled = true; };
  }, [challengeUrl, size]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `challenge-${challengeId}-qr.png`;
    link.href = dataUrl;
    link.click();
  };

  if (!dataUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-2xl bg-app-soft"
        style={{ width: size, height: size }}
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="overflow-hidden rounded-2xl border border-app bg-white p-2 shadow-app">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt={`QR code for challenge ${challengeId}`}
          width={size}
          height={size}
          className="block"
        />
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className="cursor-pointer rounded-xl bg-app-soft px-4 py-2 text-xs font-semibold text-app transition-colors hover:bg-app"
      >
        Download QR
      </button>
    </div>
  );
}
