import { GameRoomClient } from './GameRoomClient';

export default async function GamePage(
  props: {
    params: Promise<{ roomCode: string }>;
  }
) {
  const params = await props.params;
  const roomCode = params.roomCode.toUpperCase();

  return (
    <main className="game-shell flex h-screen w-screen items-center justify-center overflow-hidden text-[var(--navy)]">
      <GameRoomClient roomCode={roomCode} />
    </main>
  );
}
