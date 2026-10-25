'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraOff, Loader2, ScanLine, X } from 'lucide-react';
import jsQR from 'jsqr';

type ScanState = 'starting' | 'scanning' | 'error';

/**
 * In-app "Scan to connect" camera scanner. Mount it only while scanning
 * (parents render it conditionally). Decodes AnyDrop room QR codes with the
 * native BarcodeDetector when available, falling back to the bundled jsQR
 * everywhere else. Calls onScan() with the raw decoded text; the parent parses
 * it (parseRoomQr) and joins the room.
 */
export default function QrScanner({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (rawText: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);
  const [state, setState] = useState<ScanState>('starting');
  const [errorMsg, setErrorMsg] = useState('');

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    doneRef.current = false;

    const finish = (text: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      stopCamera();
      try {
        if (navigator.vibrate) navigator.vibrate(60);
      } catch {
        /* vibration not supported */
      }
      onScan(text);
    };

    const tick = () => {
      if (cancelled || doneRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const runDecode = async () => {
          let text: string | null = null;
          // Fast path: native BarcodeDetector (Chrome/Android)
          const BDB = (window as unknown as { BarcodeDetector?: new (o?: { formats?: string[] }) => { detect: (s: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
          if (BDB) {
            try {
              const detector = new BDB({ formats: ['qr_code'] });
              const codes = await detector.detect(video);
              if (codes.length && codes[0].rawValue) text = codes[0].rawValue;
            } catch {
              /* fall through to jsQR */
            }
          }
          // Fallback: jsQR on a downscaled frame
          const canvas = canvasRef.current;
          if (!text && canvas && video.videoWidth > 0) {
            const scale = Math.min(1, 480 / video.videoWidth);
            const w = Math.round(video.videoWidth * scale);
            const h = Math.round(video.videoHeight * scale);
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h);
              const img = ctx.getImageData(0, 0, w, h);
              try {
                const found = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' });
                if (found?.data) text = found.data;
              } catch {
                /* keep scanning */
              }
            }
          }
          if (cancelled || doneRef.current) return;
          if (text) {
            finish(text);
            return;
          }
          timerRef.current = setTimeout(tick, 120);
        };
        runDecode();
        return;
      }
      timerRef.current = setTimeout(tick, 120);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('This browser cannot access the camera.');
        setState('error');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => undefined);
        }
        setState('scanning');
        tick();
      } catch (e) {
        const err = e as DOMException;
        setErrorMsg(
          err?.name === 'NotAllowedError'
            ? 'Camera access was blocked. Allow camera permission for this site and try again.'
            : `Camera unavailable: ${err?.message || err?.name || 'unknown error'}`
        );
        setState('error');
      }
    };

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [onScan, stopCamera]);

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Scan to connect"
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <ScanLine className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex-1 font-semibold">Scan to connect</span>
        <button
          type="button"
          onClick={onClose}
          title="Close scanner"
          aria-label="Close scanner"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/15"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-950 shadow-2xl aspect-[4/3]">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          {/* corner brackets */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute left-[10%] top-[14%] h-9 w-9 rounded-tl-lg border-l-[3.5px] border-t-[3.5px] border-white/90" />
            <div className="absolute right-[10%] top-[14%] h-9 w-9 rounded-tr-lg border-r-[3.5px] border-t-[3.5px] border-white/90" />
            <div className="absolute bottom-[14%] left-[10%] h-9 w-9 rounded-bl-lg border-b-[3.5px] border-l-[3.5px] border-white/90" />
            <div className="absolute bottom-[14%] right-[10%] h-9 w-9 rounded-br-lg border-b-[3.5px] border-r-[3.5px] border-white/90" />
          </div>

          {state === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-200">
              <Loader2 className="h-7 w-7 animate-spin" aria-label="Starting camera" />
              <p className="text-sm font-medium">Starting camera…</p>
            </div>
          )}

          {state === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <CameraOff className="h-8 w-8 text-rose-300" aria-hidden="true" />
              <p className="text-sm font-medium leading-relaxed text-rose-100">{errorMsg}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-1 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25"
              >
                Close
              </button>
            </div>
          )}

          {state === 'scanning' && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent px-4 pb-3 pt-8 text-center">
              <p className="text-sm font-medium text-white">Point the camera at an AnyDrop QR code…</p>
            </div>
          )}
        </div>
      </div>

      <p className="pb-6 px-4 text-center text-xs text-slate-400">
        The QR lives on your other device — the web app pairing panel or the Chrome extension popup.
      </p>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
