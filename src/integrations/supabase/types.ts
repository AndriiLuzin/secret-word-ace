export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      casino_games: {
        Row: {
          code: string
          created_at: string | null
          current_combination: string[] | null
          current_round: number | null
          guesser_index: number | null
          guesses_in_round: number | null
          id: string
          player_count: number
          status: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_combination?: string[] | null
          current_round?: number | null
          guesser_index?: number | null
          guesses_in_round?: number | null
          id?: string
          player_count: number
          status?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_combination?: string[] | null
          current_round?: number | null
          guesser_index?: number | null
          guesses_in_round?: number | null
          id?: string
          player_count?: number
          status?: string | null
        }
        Relationships: []
      }
      casino_players: {
        Row: {
          game_id: string
          id: string
          player_index: number
          symbol: string
          viewed_at: string | null
        }
        Insert: {
          game_id: string
          id?: string
          player_index: number
          symbol: string
          viewed_at?: string | null
        }
        Update: {
          game_id?: string
          id?: string
          player_index?: number
          symbol?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casino_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "casino_games"
            referencedColumns: ["id"]
          },
        ]
      }
      crocodile_games: {
        Row: {
          code: string
          created_at: string | null
          current_guesser: number | null
          current_player: number | null
          current_word_id: string | null
          id: string
          player_count: number
          round: number | null
          showing_player: number | null
          status: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_guesser?: number | null
          current_player?: number | null
          current_word_id?: string | null
          id?: string
          player_count: number
          round?: number | null
          showing_player?: number | null
          status?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_guesser?: number | null
          current_player?: number | null
          current_word_id?: string | null
          id?: string
          player_count?: number
          round?: number | null
          showing_player?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crocodile_games_current_word_id_fkey"
            columns: ["current_word_id"]
            isOneToOne: false
            referencedRelation: "crocodile_words"
            referencedColumns: ["id"]
          },
        ]
      }
      crocodile_words: {
        Row: {
          category: string | null
          id: string
          word: string
        }
        Insert: {
          category?: string | null
          id?: string
          word: string
        }
        Update: {
          category?: string | null
          id?: string
          word?: string
        }
        Relationships: []
      }
      game_words: {
        Row: {
          id: string
          word: string
        }
        Insert: {
          id?: string
          word: string
        }
        Update: {
          id?: string
          word?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          code: string
          created_at: string | null
          id: string
          impostor_index: number | null
          player_count: number
          starting_player: number | null
          status: string | null
          views_count: number | null
          word_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          impostor_index?: number | null
          player_count: number
          starting_player?: number | null
          status?: string | null
          views_count?: number | null
          word_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          impostor_index?: number | null
          player_count?: number
          starting_player?: number | null
          status?: string | null
          views_count?: number | null
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_word_id_fkey"
            columns: ["word_id"]
            isOneToOne: false
            referencedRelation: "game_words"
            referencedColumns: ["id"]
          },
        ]
      }
      mafia_games: {
        Row: {
          code: string
          created_at: string | null
          id: string
          mafia_count: number
          player_count: number
          status: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          mafia_count: number
          player_count: number
          status?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          mafia_count?: number
          player_count?: number
          status?: string | null
        }
        Relationships: []
      }
      mafia_players: {
        Row: {
          game_id: string
          id: string
          player_index: number
          role: string
          viewed_at: string | null
        }
        Insert: {
          game_id: string
          id?: string
          player_index: number
          role: string
          viewed_at?: string | null
        }
        Update: {
          game_id?: string
          id?: string
          player_index?: number
          role?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mafia_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mafia_games"
            referencedColumns: ["id"]
          },
        ]
      }
      player_views: {
        Row: {
          game_id: string
          id: string
          player_index: number
          viewed_at: string | null
        }
        Insert: {
          game_id: string
          id?: string
          player_index: number
          viewed_at?: string | null
        }
        Update: {
          game_id?: string
          id?: string
          player_index?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_views_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      whoami_characters: {
        Row: {
          category: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      whoami_games: {
        Row: {
          code: string
          created_at: string | null
          guesser_index: number | null
          id: string
          player_count: number
          status: string | null
          views_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          guesser_index?: number | null
          id?: string
          player_count: number
          status?: string | null
          views_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          guesser_index?: number | null
          id?: string
          player_count?: number
          status?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      whoami_player_views: {
        Row: {
          game_id: string
          id: string
          player_index: number
          viewed_at: string | null
        }
        Insert: {
          game_id: string
          id?: string
          player_index: number
          viewed_at?: string | null
        }
        Update: {
          game_id?: string
          id?: string
          player_index?: number
          viewed_at?: string | null
        }
        Relationships: []
      }
      whoami_players: {
        Row: {
          character_id: string | null
          game_id: string
          guessed: boolean | null
          id: string
          player_index: number
        }
        Insert: {
          character_id?: string | null
          game_id: string
          guessed?: boolean | null
          id?: string
          player_index: number
        }
        Update: {
          character_id?: string | null
          game_id?: string
          guessed?: boolean | null
          id?: string
          player_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "whoami_players_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "whoami_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whoami_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "whoami_games"
            referencedColumns: ["id"]
          },
        ]
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
