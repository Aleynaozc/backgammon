-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create games table
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'WAITING',
    player1_id UUID,
    player2_id UUID,
    player1_name VARCHAR(50),
    player2_name VARCHAR(50),
    game_state JSONB NOT NULL,
    current_player VARCHAR(10),
    winner VARCHAR(10),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Allow reading games (e.g. for realtime subscriptions)
CREATE POLICY "Allow public read access to games"
    ON games FOR SELECT
    USING (true);

-- Enable Realtime for the games table
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- No public insert/update/delete.
-- Writes are performed by Next.js Server Actions using Service Role Key.
-- This bypasses RLS and enforces game logic securely on the server.
