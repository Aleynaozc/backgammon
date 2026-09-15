import React, { useEffect, useRef, useState } from 'react';
import { GameState, Player, Move } from '@/types/game';
import { PointUI } from './PointUI';
import { Checker } from './Checker';
import { Die } from './Dice';
import { getAllLegalMoves, validateMoveRule } from '@/lib/game/engine';
import { applyMove } from '@/lib/game/moves';

interface BoardProps {
  gameState: GameState;
  onConfirmMoves: (moves: Move[]) => Promise<void>;
  viewerPlayer: Player | 'spectator';
  hectorPlayer: Player | null;
}

export function BackgammonBoard({ gameState, onConfirmMoves, viewerPlayer, hectorPlayer }: BoardProps) {
  const [selectedPoint, setSelectedPoint] = useState<number | 'bar' | null>(null);
  const [pendingMoves, setPendingMoves] = useState<Move[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHector, setShowHector] = useState(false);
  const previousGameStateRef = useRef<GameState | null>(null);
  const hectorTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setPendingMoves([]);
    setSelectedPoint(null);
  }, [gameState.version]);

  useEffect(() => {
    const previousGameState = previousGameStateRef.current;
    previousGameStateRef.current = gameState;

    if (!previousGameState || viewerPlayer === 'spectator' || !hectorPlayer) return;

    const capturedPlayer = hectorPlayer === 'player1' ? 'player2' : 'player1';
    const wasHectorCapture = gameState.bar[capturedPlayer] > previousGameState.bar[capturedPlayer];
    if (!wasHectorCapture) return;

    if (hectorTimerRef.current !== null) {
      window.clearTimeout(hectorTimerRef.current);
    }

    setShowHector(true);
    hectorTimerRef.current = window.setTimeout(() => {
      setShowHector(false);
      hectorTimerRef.current = null;
    }, 3000);
  }, [gameState.version, hectorPlayer, viewerPlayer]);

  useEffect(() => {
    return () => {
      if (hectorTimerRef.current !== null) {
        window.clearTimeout(hectorTimerRef.current);
      }
    };
  }, []);

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
    <div className="board-layout relative flex w-full items-stretch justify-center gap-3 sm:gap-5">
      <div className="board-surface relative min-w-0 flex-1 max-w-4xl aspect-[4/3] sm:aspect-[3/2] rounded-xl bg-[var(--navy)] p-2 shadow-2xl shadow-[var(--navy)]/50 sm:p-4 flex flex-col gap-4 mx-auto select-none overflow-hidden">
      
      {/* Wood Texture / Frame Inner Bevel */}
      <div className="pointer-events-none absolute inset-0 z-0 rounded-xl border-8 border-[var(--papaya)] sm:border-[16px]"></div>

      {gameState.dice.length === 2 && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[999] flex -translate-x-1/2 -translate-y-1/2 gap-3 rounded-2xl border-2 border-[var(--coral)] bg-[var(--cream)]/95 p-3 shadow-2xl shadow-[var(--navy)]/50">
          <Die value={gameState.dice[0]} isUsed={!gameState.remainingMoves.includes(gameState.dice[0])} className="board-die h-12 w-12 sm:h-16 sm:w-16" />
          <Die value={gameState.dice[1]} isUsed={!gameState.remainingMoves.includes(gameState.dice[1])} className="board-die h-12 w-12 sm:h-16 sm:w-16" />
        </div>
      )}
      
      {/* Board Layout */}
      <div className="flex-1 flex flex-col z-10">
        
        {/* Top Half */}
        <div className="flex-1 flex w-full relative">
          {renderHalfBoard(topIndicesLeft, true)}
          
          {/* BAR */}
          <div 
            className="mx-2 flex h-full w-12 cursor-pointer flex-col items-center justify-end border-x-2 border-[var(--papaya)] bg-[var(--palm)] pb-2 shadow-inner sm:w-16"
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
          <div className="h-[2px] w-full bg-[var(--papaya)] shadow-sm sm:h-[3px]" />
        </div>

        {/* Bottom Half */}
        <div className="flex-1 flex w-full relative">
          {renderHalfBoard(bottomIndicesLeft, false)}
          
          {/* BAR */}
          <div 
            className="mx-2 flex h-full w-12 cursor-pointer flex-col items-center justify-start border-x-2 border-[var(--papaya)] bg-[var(--palm)] pt-2 shadow-inner sm:w-16"
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
            className="pointer-events-auto rounded-full bg-[var(--coral)] px-6 py-3 text-lg font-bold text-white shadow-lg shadow-black/50"
          >
            BEAR OFF
          </button>
        </div>
      )}

        {pendingMoves.length > 0 && (
          <div className="absolute bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--navy)]/95 p-2 shadow-xl backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setPendingMoves((moves) => moves.slice(0, -1));
                setSelectedPoint(null);
              }}
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-bold text-[var(--sand)]"
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
              className="rounded-lg bg-[var(--coral)] px-3 py-2 text-xs font-bold text-white"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Move'}
            </button>
          </div>
        )}
      </div>

      <aside className="bear-off-tray flex w-16 shrink-0 flex-col justify-between rounded-xl border border-[var(--coral)] bg-[var(--coral)]/80 p-2 text-[var(--navy)] shadow-xl sm:w-24 sm:p-3">
        <div className="text-center text-[10px] font-bold uppercase tracking-widest text-[var(--navy)] sm:text-xs">Bear off</div>
        <div className="bear-off-pieces flex flex-col items-center gap-2">
          <div className="bear-off-stack flex min-h-20 flex-col items-center gap-[-4px] sm:min-h-28">
            {Array.from({ length: previewState.borneOff.player2 }).map((_, index) => (
              <div key={`player2-${index}`} className="-mb-3 animate-[checker-land_500ms_ease-out] sm:-mb-4">
                <Checker player="player2" />
              </div>
            ))}
          </div>
          <div className="bear-off-divider h-px w-full bg-[var(--navy)]/30" />
          <div className="bear-off-stack flex min-h-20 flex-col items-center gap-[-4px] sm:min-h-28">
            {Array.from({ length: previewState.borneOff.player1 }).map((_, index) => (
              <div key={`player1-${index}`} className="-mb-3 animate-[checker-land_500ms_ease-out] sm:-mb-4">
                <Checker player="player1" />
              </div>
            ))}
          </div>
        </div>
        <div className="bear-off-counts space-y-1 text-center text-[10px] text-[var(--navy)]/80 sm:text-xs">
          <div>Blue {previewState.borneOff.player2}/15</div>
          <div>White {previewState.borneOff.player1}/15</div>
        </div>
      </aside>

      {showHector && (
        <div className="pointer-events-none fixed inset-0 z-[2000] flex items-center justify-center bg-[var(--navy)]/70 p-6">
          <video
            src="/hector.mp4"
            aria-label="Hector has captured a checker"
            autoPlay
            loop={false}
            playsInline
            className="hector-capture max-h-[78vh] w-[min(82vw,460px)] object-cover shadow-2xl"
          />
        </div>
      )}

    </div>
  );
}
