'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GameState, Player, Move } from '@/types/game';
import { BackgammonBoard } from '@/components/game/BackgammonBoard';
import { PlayerPanel } from '@/components/game/PlayerPanel';
import { joinGame, getGameRoomStatus, getGameSnapshot, rollDiceAction, movePieceAction } from '@/app/actions/game';
import { createClient } from '@/lib/supabase/client';

interface GameRoomClientProps {
  roomCode: string;
}

export function GameRoomClient({ roomCode }: GameRoomClientProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState<string>('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExistingRoom, setIsExistingRoom] = useState(false);
  const [isJoiningAsOtherPlayer, setIsJoiningAsOtherPlayer] = useState(false);

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [viewerPlayer, setViewerPlayer] = useState<Player | 'spectator'>('spectator');
  const [playersInfo, setPlayersInfo] = useState({ player1: '', player2: '' });
  const syncTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingMovesRef = React.useRef(false);
  const rollingDiceRef = React.useRef(false);
  
  const supabase = React.useMemo(() => createClient(), []);

  useEffect(() => {
    // Check local storage for identity
    const storedId = localStorage.getItem('bg_playerId');
    const storedName = localStorage.getItem('bg_nickname');
    
    if (storedId && storedName) {
      setPlayerId(storedId);
      setNickname(storedName);
      handleJoin(storedName, storedId);
    } else {
      void getGameRoomStatus(roomCode).then((status) => {
        if (status.error) {
          setError(status.error);
        } else if (status.isFull) {
          setError('This game room is full.');
        } else {
          setIsExistingRoom(Boolean(status.exists));
        }
        setLoading(false);
      });
    }
  }, []);

  const handleJoin = async (name: string, pId?: string) => {
    setLoading(true);
    const actualId = pId || crypto.randomUUID();
    
    if (!pId) {
      localStorage.setItem('bg_playerId', actualId);
      localStorage.setItem('bg_nickname', name);
      setPlayerId(actualId);
      setNickname(name);
    }

    try {
      const result = await joinGame(roomCode, name, actualId);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setGameState(result.gameState as unknown as GameState);
      setViewerPlayer(result.assignedPlayer as Player | 'spectator');
      setPlayersInfo({
        player1: result.player1_name || 'Waiting...',
        player2: result.player2_name || 'Waiting...',
      });
      setJoined(true);
      setLoading(false);
      
      // Initialize Realtime subscription
      if (result.gameId) {
        setupRealtime(result.gameId);
      }

      const joinedState = result.gameState as unknown as GameState;
      const bothPlayersJoined = Boolean(result.player1_name && result.player2_name);
      if (
        bothPlayersJoined &&
        joinedState.dice.length === 0 &&
        joinedState.currentPlayer === result.assignedPlayer
      ) {
        rollingDiceRef.current = true;
        void rollDiceAction(roomCode, actualId)
          .then((rollResult) => {
            if (rollResult.gameState) {
              setGameState(rollResult.gameState as unknown as GameState);
            }
          })
          .finally(() => {
            rollingDiceRef.current = false;
          });
      }
      
    } catch (e) {
      console.error("GameRoomClient joinGame error:", e);
      setError('Connection error: could not reach the server.');
      setLoading(false);
    }
  };

  const setupRealtime = (gameId: string) => {
    supabase.removeAllChannels(); // Temizle
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);

    const applyGameData = (data: {
      game_state: unknown;
      player1_name: string | null;
      player2_name: string | null;
    }) => {
      if (submittingMovesRef.current) return;
      const nextGameState = data.game_state as GameState;
      setGameState((currentGameState) => {
        if (currentGameState && nextGameState.version < currentGameState.version) {
          return currentGameState;
        }
        return nextGameState;
      });
      setPlayersInfo({
        player1: data.player1_name || 'Waiting...',
        player2: data.player2_name || 'Waiting...',
      });
    };

    const channel = supabase.channel(`game:${gameId}`);
    
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        console.log("Realtime payload received!", payload);
        applyGameData(payload.new as {
          game_state: unknown;
          player1_name: string | null;
          player2_name: string | null;
        });
      }
    ).subscribe((status) => {
      console.log("Realtime status:", status);
    });

    const syncGame = async () => {
      const data = await getGameSnapshot(roomCode);
      if (!('error' in data)) applyGameData(data);
    };

    // Realtime is instant when enabled; polling keeps both screens in sync
    // when the hosted Supabase project has not enabled the publication yet.
    void syncGame();
    syncTimerRef.current = setInterval(() => {
      void syncGame();
    }, 1000);
  };

  useEffect(() => {
    if (
      !gameState ||
      !playerId ||
      viewerPlayer === 'spectator' ||
      playersInfo.player2 === 'Waiting...' ||
      gameState.currentPlayer !== viewerPlayer ||
      gameState.dice.length !== 0 ||
      rollingDiceRef.current
    ) {
      return;
    }

    rollingDiceRef.current = true;
    void rollDiceAction(roomCode, playerId)
      .then((result) => {
        if (result.gameState) {
          setGameState(result.gameState as unknown as GameState);
        } else if (result.error) {
          console.error('Automatic dice roll failed:', result.error);
        }
      })
      .finally(() => {
        rollingDiceRef.current = false;
      });
  }, [gameState, playerId, playersInfo.player2, roomCode, viewerPlayer]);

  const handleMove = async (move: Move) => {
    if (viewerPlayer === 'spectator') return;
    
    // Optimistic UI could be here, but we wait for server to avoid race conditions.
    // For MVP, just send to server.
    const result = await movePieceAction(roomCode, playerId!, move);
    if (result.gameState) {
      setGameState(result.gameState as unknown as GameState);
    }
  };

  const handleConfirmMoves = async (moves: Move[]) => {
    if (viewerPlayer === 'spectator') return;

    submittingMovesRef.current = true;
    try {
      let latestGameState: GameState | null = null;

      for (const move of moves) {
        const result = await movePieceAction(roomCode, playerId!, move);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.gameState) {
          latestGameState = result.gameState as unknown as GameState;
        }
      }

      if (latestGameState) {
        setGameState(latestGameState);
      }
    } finally {
      submittingMovesRef.current = false;
    }
  };

  const copyLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Tavla',
        text: 'Want to play backgammon with me? 🎲',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Invite link copied!');
    }
  };

  const exitGame = () => {
    localStorage.removeItem('bg_playerId');
    localStorage.removeItem('bg_nickname');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="surf-loader" role="status" aria-live="polite" aria-label="Connecting">
        <div className="surf-loader-waves" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="surf-loader-label">CONNECTING</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-xl text-[var(--coral)]">{error}</div>;
  }

  if (!joined) {
    return (
      <div className="relative w-full max-w-sm">
        {isExistingRoom && !isJoiningAsOtherPlayer && (
          <Image
            src="/hec.png"
            alt="Hector"
            width={100}
            height={100}
            priority
            className="absolute -right-4 -top-26 z-10 object-contain"
          />
        )}
        <div className="space-y-6 rounded-2xl border border-[var(--ocean)]/30 bg-[var(--cream)] p-8 text-[var(--navy)] shadow-2xl shadow-[var(--ocean)]/25">
        {isExistingRoom ? (
          <>
            {!isJoiningAsOtherPlayer ? (
              <>
                <h2 className="pr-6 text-center text-2xl font-bold uppercase text-[var(--navy)]">HECTOR, IS THAT YOU?</h2>
                <button
                  onClick={() => handleJoin('Hector')}
                  className="w-full rounded-xl bg-[var(--coral)] py-3 font-bold uppercase text-white"
                >
                  YES
                </button>
                <button
                  onClick={() => setIsJoiningAsOtherPlayer(true)}
                  className="w-full text-sm font-semibold uppercase tracking-wide text-[var(--ocean)]"
                >
                  NO, I&apos;M THE OTHER PLAYER
                </button>
              </>
            ) : (
              <>
                <h2 className="text-center text-2xl font-bold uppercase text-[var(--navy)]">JOIN GAME</h2>
                <input
                  type="text"
                  placeholder="Your name"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-xl border border-[var(--ocean)]/40 bg-white/70 px-4 py-3 text-lg text-[var(--navy)] placeholder:text-[var(--ocean)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
                  maxLength={12}
                />
                <button
                  onClick={() => handleJoin(nickname)}
                  disabled={!nickname.trim()}
                  className="w-full rounded-xl bg-[var(--coral)] py-3 font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  JOIN
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="text-center text-2xl font-bold text-[var(--navy)]">JOIN GAME</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Your name"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-xl border border-[var(--ocean)]/40 bg-white/70 px-4 py-3 text-lg text-[var(--navy)] placeholder:text-[var(--ocean)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
                maxLength={12}
              />
              <button
                onClick={() => handleJoin(nickname)}
                disabled={!nickname.trim()}
                className="w-full rounded-xl bg-[var(--coral)] py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                JOIN
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    );
  }

  if (!gameState) return null;

  const hectorPlayer: Player | null =
    playersInfo.player1.trim().toLowerCase() === 'hector'
      ? 'player1'
      : playersInfo.player2.trim().toLowerCase() === 'hector'
        ? 'player2'
        : null;

  return (
    <div className="game-room flex h-full w-full max-w-[1400px] flex-col gap-2 p-1 sm:gap-3 sm:p-4">
      
      {/* Top Bar / Opponent */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-[200px] sm:max-w-xs">
          <PlayerPanel 
            player={viewerPlayer === 'player1' ? 'player2' : 'player1'} 
            playerName={viewerPlayer === 'player1' ? playersInfo.player2 : playersInfo.player1}
            gameState={gameState}
            isOnline={true} // TODO: Implement Presence
            isViewer={false}
            showActions={false}
          />
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          {playersInfo.player2 !== 'Waiting...' ? (
            <button onClick={exitGame} className="cursor-pointer rounded-lg border border-[var(--coral)]/50 bg-[var(--cream)] p-2 text-sm font-semibold text-[var(--navy)]">
              Exit Game
            </button>
          ) : (
            <button onClick={copyLink} className="cursor-pointer rounded-lg border border-[var(--ocean)]/40 bg-[var(--cream)] p-2 text-sm text-[var(--navy)]">
              Invite
            </button>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 sm:gap-3">
        <BackgammonBoard 
          gameState={gameState}
          onConfirmMoves={handleConfirmMoves}
          viewerPlayer={viewerPlayer}
          hectorPlayer={hectorPlayer}
        />
      </div>

      {/* Bottom Bar / You */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-[200px] sm:max-w-xs">
          <PlayerPanel 
            player={viewerPlayer === 'spectator' ? 'player1' : viewerPlayer} 
            playerName={viewerPlayer === 'spectator' ? playersInfo.player1 : (viewerPlayer === 'player1' ? playersInfo.player1 : playersInfo.player2)}
            gameState={gameState}
            isOnline={true}
            isViewer={viewerPlayer !== 'spectator'}
            showActions={false}
          />
        </div>
        
        {/* Game Status */}
        {gameState.status === 'FINISHED' && (
          <div className="text-center text-xl font-bold uppercase text-[var(--coral)]">
            GAME OVER! WINNER: {gameState.winner === 'player1' ? playersInfo.player1 : playersInfo.player2}
          </div>
        )}
      </div>

    </div>
  );
}
