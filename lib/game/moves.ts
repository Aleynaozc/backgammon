import { GameState, Player, Move } from '@/types/game';
import { getDirection, isValidDestination, getOpponent } from './rules';

export function getLegalMovesForPiece(
  state: GameState,
  player: Player,
  from: number | 'bar',
  dieValue: number
): Move | null {
  const direction = getDirection(player);
  let to: number | 'borneOff';

  if (from === 'bar') {
    // Entering from bar
    if (player === 'player1') {
      to = dieValue - 1; // 0 to 5
    } else {
      to = 24 - dieValue; // 23 to 18
    }
  } else {
    // Normal move
    const targetIdx = from + (dieValue * direction);
    if (targetIdx < 0 || targetIdx > 23) {
      to = 'borneOff';
    } else {
      to = targetIdx;
    }
  }

  // If trying to bear off, we need additional checks
  if (to === 'borneOff') {
    const { valid } = isValidDestination(state, player, 'borneOff');
    if (!valid) return null;

    // Check if exact bear off or over-bear off (only if no pieces are further behind)
    if (from !== 'bar') {
      const homeStart = player === 'player1' ? 18 : 0;
      const homeEnd = player === 'player1' ? 23 : 5;
      
      const exactDistance = player === 'player1' ? 24 - from : from + 1;
      
      if (dieValue === exactDistance) {
        return { from, to, dieValue };
      }
      
      if (dieValue > exactDistance) {
        // Can only use a larger die if there are no pieces further back
        let hasFurtherPieces = false;
        if (player === 'player1') {
          for (let i = homeStart; i < from; i++) {
            if (state.board[i].player === player) hasFurtherPieces = true;
          }
        } else {
          for (let i = homeEnd; i > from; i--) {
            if (state.board[i].player === player) hasFurtherPieces = true;
          }
        }
        if (!hasFurtherPieces) {
          return { from, to, dieValue };
        }
      }
    }
    return null; // Not a valid bear off with this die
  }

  const { valid } = isValidDestination(state, player, to);
  if (valid) {
    return { from, to, dieValue };
  }

  return null;
}

// Applies a single move and returns a NEW state
export function applyMove(state: GameState, move: Move): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state)); // Deep clone
  const { from, to, dieValue } = move;
  const player = newState.currentPlayer;
  const opponent = getOpponent(player);

  // 1. Remove from source
  if (from === 'bar') {
    newState.bar[player] -= 1;
  } else {
    newState.board[from].count -= 1;
    if (newState.board[from].count === 0) {
      newState.board[from].player = null;
    }
  }

  // 2. Add to destination
  if (to === 'borneOff') {
    newState.borneOff[player] += 1;
  } else {
    const destPoint = newState.board[to];
    if (destPoint.player === opponent && destPoint.count === 1) {
      // Capture
      destPoint.player = player;
      destPoint.count = 1;
      newState.bar[opponent] += 1;
    } else {
      // Normal placement
      destPoint.player = player;
      destPoint.count += 1;
    }
  }

  // 3. Consume die
  const dieIndex = newState.remainingMoves.indexOf(dieValue);
  if (dieIndex !== -1) {
    newState.remainingMoves.splice(dieIndex, 1);
  }

  // Check winner
  if (newState.borneOff[player] === 15) {
    newState.status = 'FINISHED';
    newState.winner = player;
  }

  return newState;
}
