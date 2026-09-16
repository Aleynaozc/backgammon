'use client';

import React, { useState, useEffect } from 'react';
import { GameViewport, OrientationOverlay } from '@/components/game/GameViewport';
import { playFeedback, setFeedbackEnabled } from '@/lib/game/feedback';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GameState, Player, Move } from '@/types/game';
import { BackgammonBoard } from '@/components/game/BackgammonBoard';
import { PlayerPanel } from '@/components/game/PlayerPanel';
import {
  joinGame,
  getGameRoomStatus,
  getGameSnapshot,
  rollDiceAction,
  confirmMovesAction,
  updatePendingMovesAction,
  devSetDiceAction,
  devLoadPresetAction,
  devAutoPlayOpponentStepAction,
} from '@/app/actions/game';
import { createClient } from '@/lib/supabase/client';
import { LogOut, Share2, Volume2, VolumeX, Wrench } from 'lucide-react';

interface GameRoomClientProps {
  roomCode: string;
}

const SYNC_POLL_INTERVAL_MS = 2000;
type DevPreset = 'bar' | 'bearOff' | 'hit' | 'finish';

export function GameRoomClient({ roomCode }: GameRoomClientProps) {
  const router = useRouter();
  const [connected, setConnected] = useState(true);
  const [feedback, setFeedback] = useState(false);
  const [nickname, setNickname] = useState<string>('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExistingRoom, setIsExistingRoom] = useState(false);
  const [isJoiningAsOtherPlayer, setIsJoiningAsOtherPlayer] = useState(false);
  const [devDice, setDevDice] = useState<[number, number]>([1, 2]);
  const [devAutoOpponent, setDevAutoOpponent] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(process.env.NODE_ENV === 'development');

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [viewerPlayer, setViewerPlayer] = useState<Player | 'spectator'>('spectator');
  const [playersInfo, setPlayersInfo] = useState({ player1: '', player2: '' });
  const syncTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingMovesRef = React.useRef(false);
  const rollingDiceRef = React.useRef(false);
  const devAutoOpponentRef = React.useRef(false);
  
  const supabase = React.useMemo(() => createClient(), []);

  const setupRealtime = React.useCallback((gameId: string) => {
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

    let syncing = false;
    const syncGame = async () => {
      if (syncing) return;
      if (!navigator.onLine) { setConnected(false); return; }
      syncing = true;
      try {
        const data = await getGameSnapshot(roomCode);
        if ('error' in data) { setConnected(false); return; }
        applyGameData(data);
        setConnected(true);
      } catch { setConnected(false); }
      finally { syncing = false; }
    };

    // Realtime is instant when enabled; polling keeps both screens in sync
    // when the hosted Supabase project has not enabled the publication yet.
    void syncGame();
    syncTimerRef.current = setInterval(() => {
      void syncGame();
    }, SYNC_POLL_INTERVAL_MS);
  }, [roomCode, supabase]);

  useEffect(() => {
    const offline = () => setConnected(false);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('offline', offline);
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      void supabase.removeAllChannels();
    };
  }, [supabase]);

  const handleJoin = React.useCallback(async (name: string, pId?: string) => {
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
        joinedState.status === 'PLAYING' &&
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
          .catch(() => setConnected(false))
          .finally(() => {
            rollingDiceRef.current = false;
          });
      }
      
    } catch (e) {
      console.error("GameRoomClient joinGame error:", e);
      setError('Connection error: could not reach the server.');
      setLoading(false);
    }
  }, [roomCode, setupRealtime]);

  useEffect(() => {
    const initializeRoom = async () => {
      const storedId = localStorage.getItem('bg_playerId');
      const storedName = localStorage.getItem('bg_nickname');
      
      if (storedId && storedName) {
        setPlayerId(storedId);
        setNickname(storedName);
        await handleJoin(storedName, storedId);
        return;
      }

      const status = await getGameRoomStatus(roomCode);
      if (status.error) {
        setError(status.error);
      } else if (status.isFull) {
        setError('This game room is full.');
      } else {
        setIsExistingRoom(Boolean(status.exists));
      }
      setLoading(false);
    };

    void initializeRoom();
  }, [handleJoin, roomCode]);

  const handleRollDice = React.useCallback(async () => {
    if (!connected || !playerId || viewerPlayer === 'spectator' || rollingDiceRef.current) return;

    rollingDiceRef.current = true;
    try {
      const result = await rollDiceAction(roomCode, playerId);
      if (result.gameState) {
        setGameState(result.gameState as unknown as GameState);
      } else if (result.error) {
        console.error('Dice roll failed:', result.error);
      }
    } catch {
      setConnected(false);
    } finally {
      rollingDiceRef.current = false;
    }
  }, [connected, playerId, roomCode, viewerPlayer]);

  useEffect(() => {
    if (
      !gameState ||
      !playerId ||
      viewerPlayer === 'spectator' ||
      playersInfo.player2 === 'Waiting...' ||
      gameState.status !== 'PLAYING' ||
      gameState.currentPlayer !== viewerPlayer ||
      gameState.dice.length !== 0 ||
      rollingDiceRef.current
    ) {
      return;
    }

    void handleRollDice();
  }, [gameState, handleRollDice, playerId, playersInfo.player2, viewerPlayer]);

  const handleConfirmMoves = async (moves: Move[]) => {
    if (!connected || viewerPlayer === 'spectator') return;

    submittingMovesRef.current = true;

    try {
      const result = await confirmMovesAction(roomCode, playerId!, moves);
      if (result.error) {
        const snapshot = await getGameSnapshot(roomCode);
        if (!('error' in snapshot)) {
          setGameState(snapshot.game_state as unknown as GameState);
        }
        setError(result.error);
        return;
      }

      if (result.gameState) {
        setGameState(result.gameState as unknown as GameState);
      }
    } catch {
      setConnected(false);
    } finally {
      submittingMovesRef.current = false;
    }
  };

  const handlePendingMovesChange = React.useCallback((moves: Move[]) => {
    if (!connected || viewerPlayer === 'spectator' || !playerId) return;

    void updatePendingMovesAction(roomCode, playerId, moves)
      .then((result) => {
        if (result.gameState) {
          setGameState((currentGameState) => {
            const nextGameState = result.gameState as unknown as GameState;
            if (currentGameState && nextGameState.version < currentGameState.version) {
              return currentGameState;
            }
            return nextGameState;
          });
        } else if (result.error) {
          console.error('Live preview update failed:', result.error);
        }
      }).catch(() => setConnected(false));
  }, [connected, playerId, roomCode, viewerPlayer]);

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

  const isDevToolsVisible = process.env.NODE_ENV === 'development' && viewerPlayer !== 'spectator';

  const applyDevResult = (result: { error?: string; gameState?: unknown }) => {
    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.gameState) {
      setGameState(result.gameState as unknown as GameState);
    }
  };

  const handleDevSetDice = async () => {
    if (!playerId) return;
    const result = await devSetDiceAction(roomCode, playerId, devDice);
    applyDevResult(result);
  };

  const handleDevLoadPreset = async (preset: DevPreset) => {
    if (!playerId) return;
    const result = await devLoadPresetAction(roomCode, playerId, preset);
    applyDevResult(result);
  };

  const handleDevAutoOpponentStep = React.useCallback(async () => {
    if (!playerId || devAutoOpponentRef.current) return;

    devAutoOpponentRef.current = true;
    try {
      const result = await devAutoPlayOpponentStepAction(roomCode, playerId);
      if (result.gameState) {
        setGameState(result.gameState as unknown as GameState);
      } else if (result.error && result.error !== 'Auto opponent waits for the opponent turn.') {
        console.error('Auto opponent failed:', result.error);
      }
    } finally {
      devAutoOpponentRef.current = false;
    }
  }, [playerId, roomCode]);

  useEffect(() => {
    if (
      !isDevToolsVisible ||
      !devAutoOpponent ||
      !gameState ||
      !playerId ||
      gameState.status !== 'PLAYING' ||
      gameState.currentPlayer === viewerPlayer
    ) {
      return;
    }

    const delayMs = gameState.dice.length === 0 ? 650 : 900;
    const timer = window.setTimeout(() => {
      void handleDevAutoOpponentStep();
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [devAutoOpponent, gameState, handleDevAutoOpponentStep, isDevToolsVisible, playerId, viewerPlayer]);

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
      
      <OrientationOverlay />
      {!connected && <div role="status" className="connection-notice">Connection lost. Reconnecting...</div>}
      {gameState.lastPass && gameState.turnNumber <= gameState.lastPass.turnNumber + 1 && <div role="status" className="pass-notice">{playersInfo[gameState.lastPass.player]}: Pass / No legal moves</div>}
      {/* Top Bar / Opponent */}
      <div className="game-topbar flex items-center justify-between">
        <div className="flex-1 max-w-[200px] sm:max-w-xs">
          <PlayerPanel 
            player={viewerPlayer === 'player1' ? 'player2' : 'player1'} 
            playerName={viewerPlayer === 'player1' ? playersInfo.player2 : playersInfo.player1}
            gameState={gameState}
            isOnline={connected} // TODO: Implement Presence
            isViewer={false}
            showActions={true}
            showDice={false}
          />
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <button type="button" aria-pressed={feedback} aria-label={feedback ? 'Disable sound' : 'Enable sound'} title={feedback ? 'Disable sound' : 'Enable sound'} className="icon-button" onClick={() => {
            const next = !feedback;
            setFeedback(next);
            try { setFeedbackEnabled(next); playFeedback('dice'); } catch { setFeedback(false); }
          }}>{feedback ? <Volume2 size={16} strokeWidth={1.7} /> : <VolumeX size={16} strokeWidth={1.7} />}</button>
          {playersInfo.player2 !== 'Waiting...' ? (
            <button onClick={exitGame} aria-label="Exit game" title="Exit game" className="icon-button">
              <LogOut size={16} strokeWidth={1.7} />
            </button>
          ) : (
            <button onClick={copyLink} aria-label="Invite opponent" title="Invite opponent" className="icon-button">
              <Share2 size={16} strokeWidth={1.7} />
            </button>
          )}
        </div>
      </div>

      <GameViewport>
        <BackgammonBoard 
          gameState={gameState}
          onConfirmMoves={handleConfirmMoves}
          onPendingMovesChange={handlePendingMovesChange}
          viewerPlayer={viewerPlayer}
          hectorPlayer={hectorPlayer}
          connected={connected}
        />

        {isDevToolsVisible && (
          <button type="button" aria-expanded={devPanelOpen} aria-label="Open development tools" title="Development tools" className="dev-toggle" onClick={() => setDevPanelOpen((open) => !open)}>
            <Wrench size={13} strokeWidth={1.7} /> DEV
          </button>
        )}
        {isDevToolsVisible && devPanelOpen && (
          <div className="fixed right-3 top-3 z-[2500] max-h-[calc(100dvh-1.5rem)] w-[min(16rem,calc(100vw-1.5rem))] overflow-auto rounded-lg border border-[var(--teal)] bg-[var(--navy)]/95 p-3 text-[var(--sand)] shadow-2xl backdrop-blur">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--teal)]">Dev Panel</div>
            <div className="mb-3 flex items-center gap-2">
              <input
                aria-label="First die"
                type="number"
                min={1}
                max={6}
                value={devDice[0]}
                onChange={(event) => setDevDice(([, second]) => [Number(event.target.value), second])}
                className="w-16 rounded border border-[var(--line)] bg-white px-2 py-1 text-sm font-bold text-[var(--navy)]"
              />
              <input
                aria-label="Second die"
                type="number"
                min={1}
                max={6}
                value={devDice[1]}
                onChange={(event) => setDevDice(([first]) => [first, Number(event.target.value)])}
                className="w-16 rounded border border-[var(--line)] bg-white px-2 py-1 text-sm font-bold text-[var(--navy)]"
              />
              <button
                type="button"
                onClick={handleDevSetDice}
                className="rounded bg-[var(--coral)] px-3 py-1 text-xs font-bold text-white"
              >
                Set
              </button>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setDevAutoOpponent((enabled) => !enabled)}
                className={[
                  'rounded border px-3 py-2 text-left text-xs font-bold',
                  devAutoOpponent
                    ? 'border-[var(--teal)] bg-[var(--teal)] text-[var(--navy)]'
                    : 'border-[var(--line)]',
                ].join(' ')}
              >
                Auto Opponent {devAutoOpponent ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => handleDevLoadPreset('bar')}
                className="rounded border border-[var(--line)] px-3 py-2 text-left text-xs font-bold"
              >
                Bar Test
              </button>
              <button
                type="button"
                onClick={() => handleDevLoadPreset('bearOff')}
                className="rounded border border-[var(--line)] px-3 py-2 text-left text-xs font-bold"
              >
                Bear Off Test
              </button>
              <button
                type="button"
                onClick={() => handleDevLoadPreset('hit')}
                className="rounded border border-[var(--line)] px-3 py-2 text-left text-xs font-bold"
              >
                Hit Test
              </button>
              <button
                type="button"
                onClick={() => handleDevLoadPreset('finish')}
                className="rounded border border-[var(--line)] px-3 py-2 text-left text-xs font-bold"
              >
                Finish Test
              </button>
            </div>
          </div>
        )}
      </GameViewport>

      {/* Bottom Bar / You */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-[200px] sm:max-w-xs">
          <PlayerPanel 
            player={viewerPlayer === 'spectator' ? 'player1' : viewerPlayer} 
            playerName={viewerPlayer === 'spectator' ? playersInfo.player1 : (viewerPlayer === 'player1' ? playersInfo.player1 : playersInfo.player2)}
            gameState={gameState}
            isOnline={connected}
            isViewer={viewerPlayer !== 'spectator'}
            onRollDice={handleRollDice}
            showActions={true}
            showDice={false}
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
