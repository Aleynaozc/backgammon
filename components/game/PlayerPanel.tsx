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
  showActions?: boolean;
  showDice?: boolean;
}

export function PlayerPanel({
  player,
  playerName,
  gameState,
  isViewer,
  showActions = true,
  showDice = true,
}: PlayerPanelProps) {
  const isTurn = gameState.currentPlayer === player;
  const hasRolled = isTurn && gameState.dice.length > 0;
  const shouldShowActions = showActions && showDice && isTurn;

  return (
    <div className={clsx("player-panel flex w-full flex-col items-center gap-2 p-2 sm:flex-row")}>
      
      {shouldShowActions && <div className="flex items-center gap-2 shrink-0">
        {hasRolled ? (
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
