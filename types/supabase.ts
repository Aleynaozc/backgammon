export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          room_code: string
          status: 'WAITING' | 'PLAYING' | 'FINISHED'
          player1_id: string | null
          player2_id: string | null
          player1_name: string | null
          player2_name: string | null
          game_state: Json
          current_player: string | null
          winner: string | null
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_code: string
          status?: 'WAITING' | 'PLAYING' | 'FINISHED'
          player1_id?: string | null
          player2_id?: string | null
          player1_name?: string | null
          player2_name?: string | null
          game_state?: Json
          current_player?: string | null
          winner?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_code?: string
          status?: 'WAITING' | 'PLAYING' | 'FINISHED'
          player1_id?: string | null
          player2_id?: string | null
          player1_name?: string | null
          player2_name?: string | null
          game_state?: Json
          current_player?: string | null
          winner?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
