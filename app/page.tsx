'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isCreatingGame, setIsCreatingGame] = useState(false);

  const handleNewGame = () => {
    setIsCreatingGame(true);
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/game/${roomCode}`);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-stone-100">

      {/* Background Image */}
      <div
        className="hero-background absolute inset-0 bg-cover bg-no-repeat"
        style={{
          backgroundImage: "url('/bg2.png')",
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-stone-950/65" />

      {/* Content */}
      <div className="relative z-10 flex w-full flex-1 items-end justify-center pb-[25vh]">
        <div className="flex flex-col items-center gap-5">
        <button
          type="button"
          onClick={handleNewGame}
          disabled={isCreatingGame}
            className="inline-flex items-center gap-3 rounded-full cursor-pointer border border-[var(--coral)] bg-[var(--coral)] px-8 py-4 text-base font-bold tracking-[0.18em] text-white shadow-[0_12px_30px_-8px_rgba(244,119,69,0.65)] focus:outline-none focus:ring-4 focus:ring-orange-300/50 disabled:cursor-wait disabled:opacity-70"
        >
            <Plus className="h-5 w-5" aria-hidden="true" />
          {isCreatingGame ? 'CREATING...' : 'NEW GAME'}
        </button>
          <p className="eyebrow" aria-label="Two souls, one board, endless places">
            <span>TWO SOULS</span>
            <b aria-hidden="true">•</b>
            <span>ONE BOARD</span>
            <b aria-hidden="true">•</b>
            <span>ENDLESS PLACES</span>
          </p>
        </div>
      </div>

      <div className="hero-coordinate" aria-label="Coordinates and the first move">
        6°50&apos;28.3&quot;K 81°50&apos;00.6&quot;D
        <br />
        <span>THE FIRST MOVE</span>
      </div>
      
    </main>
  );
}