import React, { useEffect, useState } from 'react';
import { GameState, Player, Move } from '@/types/game';
import { PointUI } from './PointUI';
import { Checker } from './Checker';
import { getAllLegalMoves, validateMoveRule } from '@/lib/game/engine';
import { applyMove } from '@/lib/game/moves';

interface BoardProps {
  gameState: GameState;
  onConfirmMoves: (moves: Move[]) => Promise<void>;
  viewerPlayer: Player | 'spectator';
}

export function BackgammonBoard({ gameState, onConfirmMoves, viewerPlayer }: BoardProps) {
  const [selectedPoint, setSelectedPoint] = useState<number | 'bar' | null>(null);
  const [pendingMoves, setPendingMoves] = useState<Move[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPendingMoves([]);
    setSelectedPoint(null);
  }, [gameState.version]);

  const previewState = pendingMoves.reduce((state, move) => applyMove(state, move), gameState);

  // Derive legal moves if it's viewer's turn
  const isMyTurn = viewerPlayer === previewState.currentPlayer;
  
  // All immediate moves for current state
  const legalMoves = isMyTurn ? getAllLegalMoves(previewState) : [];
  
  // Filter for currently selected piece
  const highlightedDestinations = selectedPoint !== null 
    ? legalMoves.filter(m => m.from === selectedPoint)
    : [];

  const handlePointClick = (index: number) => {
    if (!isMyTurn) return;

    // If already selected, try to move to this point
    if (selectedPoint !== null) {
      if (selectedPoint === index) {
        setSelectedPoint(null); // deselect
        return;
      }
      
      const move = highlightedDestinations.find(m => m.to === index);
      if (move) {
        // Enforce large dice rule if needed
        if (validateMoveRule(previewState, move)) {
          setPendingMoves((moves) => [...moves, move]);
          setSelectedPoint(null);
        } else {
          alert("Invalid move: you must play the larger die.");
        }
        return;
      }
      
      // If clicked elsewhere but it's not a valid destination, select the new point if it has our checker
      if (previewState.board[index].player === viewerPlayer && previewState.board[index].count > 0) {
        setSelectedPoint(index);
      } else {
        setSelectedPoint(null);
      }
    } else {
      // Nothing selected, try to select
      // But check if we HAVE to play from bar
      if (previewState.bar[viewerPlayer] > 0) {
        // Can only select bar
        return;
      }
      
      if (previewState.board[index].player === viewerPlayer && previewState.board[index].count > 0) {
        setSelectedPoint(index);
      }
    }
  };

  const handleBarClick = (player: Player) => {
    if (!isMyTurn || player !== viewerPlayer) return;
    if (previewState.bar[viewerPlayer] > 0) {
      setSelectedPoint('bar');
    }
  };

  const handleBearOffClick = () => {
    if (!isMyTurn || selectedPoint === null) return;
    const move = highlightedDestinations.find(m => m.to === 'borneOff');
    if (move) {
      if (validateMoveRule(previewState, move)) {
        setPendingMoves((moves) => [...moves, move]);
        setSelectedPoint(null);
      } else {
        alert("Invalid move: you must play the larger die.");
      }
    }
  };

  const renderHalfBoard = (indices: number[], isTop: boolean) => {
    return (
      <div className="flex flex-1 h-full">
        {indices.map((idx) => {
          const isHighlighted = highlightedDestinations.some(m => m.to === idx);
          const isSelected = selectedPoint === idx;
          
          return (
            <div key={idx} className="flex-1 px-[1px] sm:px-[2px]">
              <PointUI
                pointIndex={idx}
                pointData={previewState.board[idx]}
                isTop={isTop}
                isEven={idx % 2 === 0}
                isHighlighted={isHighlighted}
                selectedChecker={isSelected}
                onClick={() => handlePointClick(idx)}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const topIndicesLeft = [11, 10, 9, 8, 7, 6];
  const topIndicesRight = [5, 4, 3, 2, 1, 0];
  const bottomIndicesLeft = [12, 13, 14, 15, 16, 17];
  const bottomIndicesRight = [18, 19, 20, 21, 22, 23];

  return (
    <div className="flex w-full items-stretch justify-center gap-3 sm:gap-5">
      <div className="relative min-w-0 flex-1 max-w-4xl aspect-[4/3] sm:aspect-[3/2] bg-[#5C4033] p-2 sm:p-4 rounded-xl shadow-2xl flex flex-col gap-4 mx-auto select-none overflow-hidden">
      
      {/* Wood Texture / Frame Inner Bevel */}
      <div className="absolute inset-0 rounded-xl border-8 sm:border-[16px] border-[#3E2723] pointer-events-none z-0"></div>
      
      {/* Board Layout */}
      <div className="flex-1 flex flex-col z-10">
        
        {/* Top Half */}
        <div className="flex-1 flex w-full relative">
          {renderHalfBoard(topIndicesLeft, true)}
          
          {/* BAR */}
          <div 
            className="w-12 sm:w-16 h-full bg-[#3E2723] mx-2 flex flex-col items-center justify-end pb-2 cursor-pointer shadow-inner"
            onClick={() => handleBarClick('player2')}
          >
            {/* Player 2 Bar */}
            {Array.from({ length: previewState.bar.player2 }).map((_, i) => (
              <div key={i} className="-mb-1"><Checker player="player2" isSelected={selectedPoint === 'bar' && viewerPlayer === 'player2'} /></div>
            ))}
          </div>
          
          {renderHalfBoard(topIndicesRight, true)}
        </div>

        {/* Middle Hinge Line */}
        <div className="relative z-30 my-1 flex h-12 w-full items-center justify-center opacity-100 sm:h-16">
          <div className="w-full h-[1px] sm:h-[2px] bg-black/40 shadow-sm" />
        </div>

        {/* Bottom Half */}
        <div className="flex-1 flex w-full relative">
          {renderHalfBoard(bottomIndicesLeft, false)}
          
          {/* BAR */}
          <div 
            className="w-12 sm:w-16 h-full bg-[#3E2723] mx-2 flex flex-col items-center justify-start pt-2 cursor-pointer shadow-inner"
            onClick={() => handleBarClick('player1')}
          >
            {/* Player 1 Bar */}
            {Array.from({ length: previewState.bar.player1 }).map((_, i) => (
              <div key={i} className="-mt-1"><Checker player="player1" isSelected={selectedPoint === 'bar' && viewerPlayer === 'player1'} /></div>
            ))}
          </div>
          
          {renderHalfBoard(bottomIndicesRight, false)}
        </div>

      </div>

      {/* Bear Off Trays - Simplified implementation for MVP. Displayed outside the main board or as a side panel */}
      {/* For mobile-first, we can just show a button or zone for bearing off when valid */}
      {highlightedDestinations.some(m => m.to === 'borneOff') && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <button 
            onClick={handleBearOffClick}
            className="pointer-events-auto bg-green-500 text-white font-bold py-3 px-6 rounded-full shadow-lg shadow-black/50 animate-pulse text-lg"
          >
            BEAR OFF
          </button>
        </div>
      )}

        {pendingMoves.length > 0 && (
          <div className="absolute bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/20 bg-stone-950/90 p-2 shadow-xl backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setPendingMoves((moves) => moves.slice(0, -1));
                setSelectedPoint(null);
              }}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-stone-200 transition-colors hover:bg-white/10"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSubmitting(true);
                void onConfirmMoves(pendingMoves).finally(() => {
                  setIsSubmitting(false);
                });
              }}
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-emerald-950 transition-colors hover:bg-emerald-400"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Move'}
            </button>
          </div>
        )}
      </div>

      <aside className="flex w-16 shrink-0 flex-col justify-between rounded-xl border border-[#8B6B4E] bg-[#3E2723] p-2 shadow-xl sm:w-24 sm:p-3">
        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-[#E6D5B8] sm:text-xs">Bear off</div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex min-h-20 flex-col items-center gap-[-4px] sm:min-h-28">
            {Array.from({ length: previewState.borneOff.player2 }).map((_, index) => (
              <div key={`player2-${index}`} className="-mb-3 animate-[checker-land_500ms_ease-out] sm:-mb-4">
                <Checker player="player2" />
              </div>
            ))}
          </div>
          <div className="h-px w-full bg-white/15" />
          <div className="flex min-h-20 flex-col items-center gap-[-4px] sm:min-h-28">
            {Array.from({ length: previewState.borneOff.player1 }).map((_, index) => (
              <div key={`player1-${index}`} className="-mb-3 animate-[checker-land_500ms_ease-out] sm:-mb-4">
                <Checker player="player1" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1 text-center text-[10px] text-stone-300 sm:text-xs">
          <div>Blue {previewState.borneOff.player2}/15</div>
          <div>White {previewState.borneOff.player1}/15</div>
        </div>
      </aside>

    </div>
  );
}
