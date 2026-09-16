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
    <div className={clsx(
      "player-panel flex w-full flex-col items-center gap-3 rounded-lg p-3 sm:flex-row",
   
    )}>
      
      {/* Player Info */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <div className="flex items-center gap-2">
          {/* Color Indicator */}
          <div className={clsx(
            "w-4 h-4 rounded-full border shadow-sm shrink-0 border-[var(--teal)] bg-[var(--ocean)]"
          )} />
          <span className="truncate text-sm font-bold uppercase text-white sm:text-base">
            {playerName} {isViewer && "(You)"}
          </span>
         
        </div>
      </div>

      {shouldShowActions && <div className="flex items-center gap-2 shrink-0">
        {canRoll ? (
          <button
            onClick={onRollDice}
            className="rounded-lg bg-[var(--coral)] px-4 py-2 text-sm font-bold text-white shadow-md sm:text-base"
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
          <div className="text-sm italic text-[var(--brown)]/70">Rolling...</div>
        )}
      </div>}
    </div>
  );
}
