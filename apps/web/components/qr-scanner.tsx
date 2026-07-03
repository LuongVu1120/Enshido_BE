'use client';

import { useEffect, useRef, useState } from 'react';

// Quét QR phiếu sản xuất bằng camera (@zxing/browser). US6 / SC-004.
// Phase 013: `continuous` = quét liên tục nhiều mã (chống lặp cùng 1 mã trong ~2s).
export function QrScanner({ onResult, continuous = false }: { onResult: (text: string) => void; continuous?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(false);
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  useEffect(() => {
    let controls: any;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        setActive(true);
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result: any) => {
          if (!result || cancelled) return;
          const text = result.getText();
          if (continuous) {
            const now = Date.now();
            if (text === lastRef.current.text && now - lastRef.current.at < 2000) return; // chống lặp
            lastRef.current = { text, at: now };
            onResult(text);
          } else {
            cancelled = true;
            controls?.stop();
            onResult(text);
          }
        });
      } catch (e: any) {
        setError('Không mở được camera. Hãy nhập mã thủ công bên dưới.');
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {active && (
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
        )}
      </div>
      {error && <p className="mt-2 text-center text-sm text-amber-600">{error}</p>}
    </div>
  );
}
