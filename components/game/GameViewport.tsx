"use client";
import { useEffect, useRef, type ReactNode } from 'react';

export function GameViewport({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const compact = window.matchMedia('(orientation: landscape) and (max-height: 650px)').matches;
      const portrait = window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
      const ratio = compact ? 2.12 : portrait ? 1.22 : window.innerWidth >= 1500 ? 2.02 : 1.96;
      const frameWidth = Math.max(1, Math.min(width, height * ratio, window.innerWidth >= 1500 ? 1160 : 1060));
      element.style.setProperty('--game-room-frame-width', `${frameWidth}px`);
      element.style.setProperty('--game-room-scale', `${Math.max(.75, Math.min(1.2, frameWidth / ratio / 260))}`);
      element.parentElement?.style.setProperty('--game-board-row-width', `${frameWidth}px`);
      // Measure the rendered point so every checker fits both its lane and a full stack.
      const point = element.querySelector<HTMLElement>('[data-room-point]');
      if (point) {
        const { width: pointWidth, height: pointHeight } = point.getBoundingClientRect();
        const gap = compact ? 1 : portrait ? 3 : 2;
        const diameter = Math.max(1, Math.min(48, pointWidth * .88, (pointHeight - 4 - 4 * gap) / 5));
        element.style.setProperty('--checker-size', `${diameter}px`);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={host} className="game-viewport">{children}</div>;
}
