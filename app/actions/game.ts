'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getInitialGameState } from '@/lib/game/board';
import { GameState, Player, Move } from '@/types/game';
import { Json } from '@/types/supabase';
import { rollDice } from '@/lib/game/rules';
import { validateMoveRule, endTurn, checkTurnEnd } from '@/lib/game/engine';
import { applyMove } from '@/lib/game/moves';

export async function joinGame(roomCode: string, playerName: string, playerId: string) {
  let supabase;
  try {
    supabase = await createAdminClient();
  } catch (err: any) {
    console.error("createAdminClient Error:", err);
    return { error: 'Server configuration error: ' + err.message };
  }

  // Find existing game
  let { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
    console.error("Supabase Select Error:", error);
    return { error: 'Database error.' };
  }

  // If game doesn't exist, create it
  if (!game) {
    const initialState = getInitialGameState();
    const { data: newGame, error: createError } = await supabase
      .from('games')
      .insert({
        room_code: roomCode,
        player1_id: playerId,
        player1_name: playerName,
        game_state: initialState as unknown as Json,
        current_player: 'player1',
        status: 'WAITING',
      })
      .select('*')
      .single();

    if (createError) {
      console.error("Supabase Insert Error:", createError);
      return { error: 'Could not create the game.' };
    }
    return { 
      gameId: newGame.id, 
      gameState: newGame.game_state, 
      assignedPlayer: 'player1',
      player1_name: newGame.player1_name,
      player2_name: newGame.player2_name,
    };
  }

  // If game exists, check if user is already in it
  if (game.player1_id === playerId) {
    return { 
      gameId: game.id, 
      gameState: game.game_state, 
      assignedPlayer: 'player1',
      player1_name: game.player1_name,
      player2_name: game.player2_name,
    };
  }
  if (game.player2_id === playerId) {
    return { 
      gameId: game.id, 
      gameState: game.game_state, 
      assignedPlayer: 'player2',
      player1_name: game.player1_name,
      player2_name: game.player2_name,
    };
  }

  // New player joining
  if (!game.player2_id) {
    // Join as player 2
    const gameState = {
      ...(game.game_state as unknown as GameState),
      status: 'PLAYING' as const,
    };
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({
        player2_id: playerId,
        player2_name: playerName,
        status: 'PLAYING',
        game_state: gameState as unknown as Json,
      })
      .eq('id', game.id)
      .select('*')
      .single();

    if (updateError) return { error: 'Could not join the game.' };
    return { 
      gameId: updatedGame.id, 
      gameState: updatedGame.game_state, 
      assignedPlayer: 'player2',
      player1_name: updatedGame.player1_name,
      player2_name: updatedGame.player2_name,
    };
  }

  // Room is full
  return { error: 'The game room is full.' };
}

export async function getGameSnapshot(roomCode: string) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('games')
    .select('game_state, player1_name, player2_name')
    .eq('room_code', roomCode)
    .single();

  if (error || !data) return { error: 'Could not read the game state.' };
  return data;
}

export async function rollDiceAction(roomCode: string, playerId: string) {
  const supabase = await createAdminClient();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!game) return { error: 'Game not found.' };
  if (game.status !== 'PLAYING') return { error: 'The game is not active.' };

  const playerRole = game.player1_id === playerId ? 'player1' : (game.player2_id === playerId ? 'player2' : null);
  if (!playerRole || game.current_player !== playerRole) return { error: 'It is not your turn.' };

  const state = game.game_state as unknown as GameState;
  if (state.dice.length > 0) return { error: 'You have already rolled.' };

  const newDice = rollDice();
  // Doubles logic
  let remainingMoves = [newDice[0], newDice[1]];
  if (newDice[0] === newDice[1]) {
    remainingMoves = [newDice[0], newDice[0], newDice[0], newDice[0]];
  }

  let newState: GameState = {
    ...state,
    dice: newDice as [number, number],
    remainingMoves,
    version: state.version + 1,
  };

  newState = checkTurnEnd(newState);

  const { error: updateError } = await supabase
    .from('games')
    .update({ 
      game_state: newState as unknown as Json,
      version: game.version + 1,
    })
    .eq('id', game.id)
    .eq('version', game.version); // Optimistic Concurrency Control

  if (updateError) return { error: 'Could not save the dice result.' };
  return { success: true, gameState: newState };
}

export async function movePieceAction(roomCode: string, playerId: string, move: Move) {
  const supabase = await createAdminClient();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('room_code', roomCode)
    .single();

  if (!game) return { error: 'Game not found.' };
  
  const playerRole = game.player1_id === playerId ? 'player1' : (game.player2_id === playerId ? 'player2' : null);
  if (!playerRole || game.current_player !== playerRole) return { error: 'It is not your turn.' };

  let state = game.game_state as unknown as GameState;

  // Validate Move
  if (!validateMoveRule(state, move)) {
    return { error: 'Geçersiz hamle.' };
  }

  // Apply Move
  state = applyMove(state, move);
  
  // Check if turn ends
  state = checkTurnEnd(state);

  state.version += 1;

  const { error: updateError } = await supabase
    .from('games')
    .update({ 
      game_state: state as unknown as Json,
      current_player: state.currentPlayer,
      status: state.status,
      winner: state.winner,
      version: game.version + 1,
    })
    .eq('id', game.id)
    .eq('version', game.version);

  if (updateError) return { error: 'Could not save the move.' };
  return { success: true, gameState: state };
}
