import React from 'react';
import { Player } from '@/types/game';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CheckerProps {
  player: Player;
  count?: number; // if we want to show numbers for stacks > 5
  isSelected?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Checker({
  player,
  count = 1,
  isSelected,
  isClickable,
  onClick,
  className
}: CheckerProps) {
  const isPlayer1 = player === 'player1';
  
  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={twMerge(
        clsx(
          "relative rounded-full shadow-md flex items-center justify-center transition-all duration-200",
          "checker-piece w-10 h-10 sm:w-12 sm:h-12 border-2",
          isPlayer1 
            ? "bg-[var(--sand)] border-[var(--coral)] text-[var(--navy)]"
            : "bg-[var(--ocean)] border-[var(--teal)] text-[var(--navy)]",
          isClickable && "cursor-pointer hover:scale-105",
          isSelected && "z-10 scale-105 ring-4 ring-[var(--coral)]/70 shadow-lg",
          !isClickable && "cursor-default"
        ),
        className
      )}
    >
      {/* Inner bevel effect */}
      <div className="absolute inset-1 rounded-full border border-black/10 border-b-black/20"></div>
      
      {/* Show count if stacked too high */}
      {count > 1 && (
        <span className="z-10 font-bold text-xs sm:text-sm drop-shadow-md">
          {count}
        </span>
      )}
    </div>
  );
}
