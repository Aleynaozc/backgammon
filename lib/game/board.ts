import { GameState, Point } from '@/types/game';

export const INITIAL_BOARD: Point[] = Array(24).fill(null).map(() => ({ player: null, count: 0 }));

// Player 1 moves 0 -> 23 (home is 18-23)
INITIAL_BOARD[0] = { player: 'player1', count: 2 };
INITIAL_BOARD[11] = { player: 'player1', count: 5 };
INITIAL_BOARD[16] = { player: 'player1', count: 3 };
INITIAL_BOARD[18] = { player: 'player1', count: 5 };

// Player 2 moves 23 -> 0 (home is 0-5)
INITIAL_BOARD[23] = { player: 'player2', count: 2 };
INITIAL_BOARD[12] = { player: 'player2', count: 5 };
INITIAL_BOARD[7] = { player: 'player2', count: 3 };
INITIAL_BOARD[5] = { player: 'player2', count: 5 };

export function getInitialGameState(): GameState {
  return {
    board: JSON.parse(JSON.stringify(INITIAL_BOARD)), // Deep copy
    bar: { player1: 0, player2: 0 },
    borneOff: { player1: 0, player2: 0 },
    dice: [],
    remainingMoves: [],
    currentPlayer: 'player1',
    status: 'WAITING',
    winner: null,
    turnNumber: 0,
    version: 1,
  };
}
