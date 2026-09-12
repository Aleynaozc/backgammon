import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DiceProps {
  value: number;
  isUsed?: boolean;
  className?: string;
}

export function Die({ value, isUsed, className }: DiceProps) {
  if (value < 1 || value > 6) return null;

  const dotPositions: Record<number, string[]> = {
    1: ['col-start-2 row-start-2'],
    2: ['col-start-1 row-start-3', 'col-start-3 row-start-1'],
    3: ['col-start-1 row-start-3', 'col-start-2 row-start-2', 'col-start-3 row-start-1'],
    4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    5: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-2 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    6: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-2', 'col-start-3 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
  };

  return (
    <div
      className={twMerge(
        clsx(
          "w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl shadow-md border border-stone-200 p-1.5 sm:p-2",
          "grid grid-cols-3 grid-rows-3 gap-0.5",
          "transition-opacity duration-300",
          isUsed && "opacity-40"
        ),
        className
      )}
    >
      {dotPositions[value].map((pos, idx) => (
        <div key={idx} className={clsx("w-full h-full bg-stone-800 rounded-full", pos)} />
      ))}
    </div>
  );
}
