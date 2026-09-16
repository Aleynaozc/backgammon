import React from 'react';
import { Player, GameState } from '@/types/game';
import clsx from 'clsx';
import { Die } from './Dice';

interface PlayerPanelProps {
  player: Player;
  playerName: string;
  gameState: GameState;
  isOnline: boolean;
  isViewer: boolean;
  onRollDice?: () => void;
  showActions?: boolean;
  showDice?: boolean;
}

export function PlayerPanel({
  player,
  playerName,
  gameState,
  isOnline,
  isViewer,
  onRollDice,
  showActions = true,
  showDice = true,
}: PlayerPanelProps) {
  const isTurn = gameState.currentPlayer === player;
  const hasRolled = isTurn && gameState.dice.length > 0;
  const canRoll = isTurn && !hasRolled && isViewer;
  const shouldShowActions = showActions && isTurn && (canRoll || (!hasRolled && showDice) || (hasRolled && showDice));

  return (
    <div className={clsx("player-panel flex w-full flex-col items-center gap-2 p-2 sm:flex-row")}>
      
      {/* Player Info */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <div className="flex items-center gap-2">
          {/* Color Indicator */}
          <div className={clsx("h-2 w-2 rounded-full shrink-0", isTurn ? "bg-[var(--coral)]" : "bg-[var(--sand)]/60")} />
          <span className="truncate text-xs font-medium uppercase tracking-[0.16em] text-[var(--cream)] sm:text-sm">
            {playerName || 'Waiting for opponent'}
          </span>
          {isViewer && <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--sand)]/70">You</span>}
         
        </div>
      </div>

      {shouldShowActions && <div className="flex items-center gap-2 shrink-0">
        {canRoll ? (
          <button
            onClick={onRollDice}
            className="rounded-md bg-[var(--navy)] px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--cream)] shadow-md transition-colors hover:bg-[var(--ocean)] sm:text-sm"
          >
            ROLL DICE
          </button>
        ) : hasRolled && showDice ? (
          <div className="flex gap-1.5 sm:gap-2">
            {gameState.dice.length === 2 && (
              <>
                <Die value={gameState.dice[0]} isUsed={!gameState.remainingMoves.includes(gameState.dice[0])} />
                <Die value={gameState.dice[1]} isUsed={!gameState.remainingMoves.includes(gameState.dice[1])} />
              </>
            )}
          </div>
        ) : (
          <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--sand)]/70">Rolling...</div>
        )}
      </div>}
    </div>
  );
}
