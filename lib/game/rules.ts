import { Player, GameState, Point } from '@/types/game';

export const getDirection = (player: Player) => (player === 'player1' ? 1 : -1);

export const getOpponent = (player: Player): Player => (player === 'player1' ? 'player2' : 'player1');

export function canBearOff(state: GameState, player: Player): boolean {
  if (state.bar[player] > 0) return false;

  let piecesInHome = state.borneOff[player];
  const homeStart = player === 'player1' ? 18 : 0;
  const homeEnd = player === 'player1' ? 23 : 5;

  for (let i = homeStart; i <= homeEnd; i++) {
    if (state.board[i].player === player) {
      piecesInHome += state.board[i].count;
    }
  }

  // All 15 pieces must be in home board or borne off
  return piecesInHome === 15;
}

export function isValidDestination(
  state: GameState,
  player: Player,
  to: number | 'borneOff'
): { valid: boolean; capture: boolean } {
  if (to === 'borneOff') {
    return { valid: canBearOff(state, player), capture: false };
  }

  const point = state.board[to];
  if (point.player === null || point.player === player) {
    return { valid: true, capture: false };
  }

  if (point.player !== player && point.count === 1) {
    // Blot (single checker) -> can be captured
    return { valid: true, capture: true };
  }

  // Point is blocked by opponent (2 or more checkers)
  return { valid: false, capture: false };
}

// Rolls dice securely
export function rollDice(): [number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}
