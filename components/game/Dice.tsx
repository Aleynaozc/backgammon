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
          "die h-10 w-10 rounded-xl border border-[var(--sand)] bg-[var(--papaya)] p-1.5 shadow-md sm:h-12 sm:w-12 sm:p-2",
          "grid grid-cols-3 grid-rows-3 gap-0.5",
          "transition-opacity duration-300",
          isUsed && "opacity-40"
        ),
        className
      )}
    >
      {dotPositions[value].map((pos, idx) => (
        <div key={idx} className={clsx("h-full w-full rounded-full bg-[var(--navy)]", pos)} />
      ))}
    </div>
  );
}
