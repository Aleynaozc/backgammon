import React from 'react';
import { Point as PointType } from '@/types/game';
import { Checker } from './Checker';
import clsx from 'clsx';

interface PointUIProps {
  pointIndex: number;
  pointData: PointType;
  isTop: boolean;
  isEven: boolean;
  isHighlighted?: boolean;
  highlightValues?: number[];
  onPointClick?: () => void;
  onCheckerClick?: () => void;
  isCheckerClickable?: boolean;
  selectedChecker?: boolean; // True if the top checker on this point is selected
}

export function PointUI({
  pointIndex,
  pointData,
  isTop,
  isEven,
  isHighlighted,
  highlightValues = [],
  onPointClick,
  onCheckerClick,
  isCheckerClickable,
  selectedChecker
}: PointUIProps) {
  // Colors for the points
  const colorClass = isEven ? 'bg-[var(--coral)]' : 'bg-[var(--papaya)]';

  // Triangle shape
  const clipPath = isTop
    ? 'polygon(0 0, 100% 0, 50% 100%)' // Pointing down
    : 'polygon(50% 0, 0 100%, 100% 100%)'; // Pointing up

  // How many checkers to render. If more than 5, we stack them visually.
  const displayCount = Math.min(pointData.count, 5);
  const checkers = Array.from({ length: displayCount }).map((_, i) => i);
  const hasMore = pointData.count > 5;
  const canClickPoint = Boolean(isHighlighted && onPointClick);
  const canSelectChecker = Boolean(isCheckerClickable && onCheckerClick);
  const canInteract = canClickPoint || canSelectChecker;

  return (
    <div
      className={clsx(
        "point-touch-area relative w-full h-full flex flex-col items-center group",
        canInteract ? "cursor-pointer" : "cursor-default",
        isTop ? "justify-start" : "justify-end"
      )}
    >
      <button
        type="button"
        className="point-hitbox absolute inset-0 z-40 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--teal)]"
        disabled={!canInteract}
        aria-label={`${canClickPoint ? 'Move to' : 'Select'} point ${pointIndex + 1}, ${pointData.count} checkers`}
        aria-pressed={Boolean(selectedChecker)}
        onClick={canClickPoint ? onPointClick : onCheckerClick}
      />
      {/* The Triangle */}
      <div
        className={clsx(
          "absolute w-[80%] h-full opacity-90 transition-all duration-200",
          colorClass,
          isHighlighted && "z-10 opacity-100 ring-4 ring-[var(--teal)] shadow-[0_0_28px_rgba(99,230,226,0.95)]"
        )}
        style={{ clipPath }}
      />

      {/* Highlight Overlay if valid move */}
      {isHighlighted && (
        <>
          <div
            className="absolute z-10 h-full w-[80%] animate-pulse bg-[var(--teal)]/70"
            style={{ clipPath }}
          />
          <div className={clsx(
            "absolute left-1/2 z-30 flex -translate-x-1/2 items-center justify-center gap-1 rounded-full border-2 border-white bg-[var(--coral)] px-2 py-1 text-[10px] font-black text-white shadow-xl shadow-black/40 sm:text-xs",
            isTop ? "bottom-3" : "top-3"
          )}>
            {highlightValues.map((value, index) => (
              <span key={`${value}-${index}`}>{value}</span>
            ))}
          </div>
        </>
      )}

      {/* Checkers Container */}
      <div className={clsx(
        "absolute flex flex-col z-20 w-full items-center",
        isTop ? "top-0" : "bottom-0"
      )}>
        {checkers.map((idx) => {
          const isTopChecker = isTop ? idx === checkers.length - 1 : idx === 0;
          const isSelected = selectedChecker && isTopChecker;

          return (
            <div
              key={idx}
              className={clsx(
                "checker-stack-item relative transition-transform duration-300",
                isTop ? "-mt-1 first:mt-0" : "-mb-1 first:mb-0" // overlapping slightly
              )}
            >
              <Checker
                player={pointData.player!}
                count={isTopChecker && hasMore ? pointData.count : 1}
                isSelected={isSelected}
                isClickable={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
