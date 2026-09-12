import { GameRoomClient } from './GameRoomClient';

export default async function GamePage(
  props: {
    params: Promise<{ roomCode: string }>;
  }
) {
  const params = await props.params;
  const roomCode = params.roomCode.toUpperCase();

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-stone-900 text-stone-100 items-center justify-center">
      <GameRoomClient roomCode={roomCode} />
    </main>
  );
}
