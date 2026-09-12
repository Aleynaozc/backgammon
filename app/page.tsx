'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [randomRoomCode, setRandomRoomCode] = useState<string>('');

  useEffect(() => {
    setRandomRoomCode(Math.random().toString(36).substring(2, 8).toUpperCase());
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-stone-900 text-stone-100">
      <div className="max-w-md w-full flex flex-col items-center space-y-8 bg-stone-800 p-8 rounded-2xl shadow-2xl border border-stone-700">
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-[#E6D5B8]">TAVLA</h1>
          <p className="text-stone-400 text-sm">Classic Backgammon — Real-time play</p>
        </div>

        <div className="flex w-full flex-col space-y-4">
          <Link
            href={randomRoomCode ? `/game/${randomRoomCode}` : '#'}
            className="w-full bg-[#E6D5B8] hover:bg-[#D4C3A3] text-stone-900 font-bold py-4 rounded-xl text-center transition-transform active:scale-95 shadow-lg text-lg"
          >
            NEW GAME
          </Link>
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-stone-600"></div>
            <span className="flex-shrink-0 mx-4 text-stone-500 text-sm">or</span>
            <div className="flex-grow border-t border-stone-600"></div>
          </div>
          
          <form 
            className="flex flex-col space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as any).roomCode.value.toUpperCase();
              if (input) router.push(`/game/${input}`);
            }}
          >
            <input 
              name="roomCode"
              type="text" 
              placeholder="Room code"
              maxLength={6}
              className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-3 text-center text-lg font-mono uppercase tracking-widest focus:ring-2 focus:ring-[#E6D5B8] focus:outline-none placeholder-stone-500"
            />
            <button 
              type="submit"
              className="w-full bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold py-3 rounded-xl transition-colors active:scale-95"
            >
              JOIN GAME
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
