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
}

export function PlayerPanel({
  player,
  playerName,
  gameState,
  isOnline,
  isViewer,
  onRollDice,
  showActions = true,
}: PlayerPanelProps) {
  const isTurn = gameState.currentPlayer === player;
  const hasRolled = isTurn && gameState.dice.length > 0;
  const canRoll = isTurn && !hasRolled && isViewer;

  const borneOffCount = gameState.borneOff[player];

  return (
    <div className={clsx(
      "flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg transition-all duration-300 w-full",
      isTurn ? "bg-white/10 shadow-md ring-1 ring-white/20" : "bg-transparent opacity-80"
    )}>
      
      {/* Player Info */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <div className="flex items-center gap-2">
          {/* Color Indicator */}
          <div className={clsx(
            "w-4 h-4 rounded-full border shadow-sm shrink-0",
            player === 'player1' ? "bg-[#E6D5B8] border-[#D4C3A3]" : "bg-[#2A4365] border-[#1A365D]"
          )} />
          <span className="font-bold text-white truncate text-sm sm:text-base">
            {playerName} {isViewer && "(You)"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-xs sm:text-sm">
          <div className={clsx(
            "w-2 h-2 rounded-full",
            isOnline ? "bg-green-400" : "bg-stone-500"
          )} />
            <span className={isOnline ? "text-green-300" : "text-stone-400"}>
            {isOnline ? "Online" : "Waiting for connection"}
          </span>
          <span className="text-white/50 ml-auto">
            Collected: {borneOffCount}/15
          </span>
        </div>
      </div>

      {showActions && <div className="flex items-center gap-2 shrink-0">
        {isTurn && (
          <>
            {canRoll ? (
              <button
                onClick={onRollDice}
                className="bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold py-2 px-4 rounded-lg shadow-md active:scale-95 transition-all text-sm sm:text-base"
              >
                ROLL DICE
              </button>
            ) : hasRolled ? (
              <div className="flex gap-1.5 sm:gap-2">
                {gameState.dice.length === 2 && (
                  <>
                    <Die value={gameState.dice[0]} isUsed={!gameState.remainingMoves.includes(gameState.dice[0])} />
                    <Die value={gameState.dice[1]} isUsed={!gameState.remainingMoves.includes(gameState.dice[1])} />
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm text-white/50 italic animate-pulse">Rolling...</div>
            )}
          </>
        )}
      </div>}
    </div>
  );
}
