"use client";
import { useEffect, useRef, type ReactNode } from 'react';

export function GameViewport({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const sideSpace = Number.parseFloat(getComputedStyle(element).getPropertyValue('--board-side-space')) || 84;
      const boardWidth = Math.max(1, Math.min(896, width - sideSpace, (height - 52) * 1.5));
      element.style.setProperty('--board-width', `${boardWidth}px`);
      element.style.setProperty('--checker-size', `${Math.max(4, Math.min(48, (boardWidth / 1.5 - 90) / 10, (boardWidth - 110) / 12))}px`);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={host} className="game-viewport">{children}</div>;
}

export function OrientationOverlay() {
  return <div className="orientation-overlay" role="status" aria-live="polite">
    <div className="rotate-phone" aria-hidden="true">&#8635;</div>
    <h2>Please rotate your device to landscape</h2>
    <p>Your board is ready. Turn your device to continue.</p>
  </div>;
}
