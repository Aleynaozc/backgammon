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
  onClick?: () => void;
  selectedChecker?: boolean; // True if the top checker on this point is selected
}

export function PointUI({
  pointIndex,
  pointData,
  isTop,
  isEven,
  isHighlighted,
  onClick,
  selectedChecker
}: PointUIProps) {
  // Colors for the points
  const colorClass = isEven ? 'bg-[#967C62]' : 'bg-[#D1BFA5]'; // darker wood, lighter wood
  
  // Triangle shape
  const clipPath = isTop 
    ? 'polygon(0 0, 100% 0, 50% 100%)' // Pointing down
    : 'polygon(50% 0, 0 100%, 100% 100%)'; // Pointing up

  // How many checkers to render. If more than 5, we stack them visually.
  const displayCount = Math.min(pointData.count, 5);
  const checkers = Array.from({ length: displayCount }).map((_, i) => i);
  const hasMore = pointData.count > 5;

  return (
    <div 
      className={clsx(
        "relative w-full h-full flex flex-col items-center cursor-pointer group",
        isTop ? "justify-start" : "justify-end"
      )}
      onClick={onClick}
    >
      {/* The Triangle */}
      <div 
        className={clsx(
          "absolute w-[80%] h-full opacity-80 transition-all duration-200",
          colorClass,
          isHighlighted && "ring-4 ring-yellow-400 opacity-100 z-10"
        )}
        style={{ clipPath }}
      />
      
      {/* Highlight Overlay if valid move */}
      {isHighlighted && (
        <div 
          className="absolute w-[80%] h-full bg-yellow-400/30 z-10"
          style={{ clipPath }}
        />
      )}

      {/* Checkers Container */}
      <div className={clsx(
        "absolute flex flex-col z-20 w-full items-center",
        isTop ? "top-0" : "bottom-0"
      )}>
        {checkers.map((idx) => {
          const isTopChecker = idx === 0;
          const isSelected = selectedChecker && isTopChecker;
          
          return (
            <div 
              key={idx} 
              className={clsx(
                "relative transition-transform duration-300",
                isTop ? "-mt-1 first:mt-0" : "-mb-1 first:mb-0" // overlapping slightly
              )}
            >
              <Checker 
                player={pointData.player!} 
                count={isTopChecker && hasMore ? pointData.count : 1}
                isSelected={isSelected}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
