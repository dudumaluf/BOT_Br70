export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: number
          created_at: string
          type: 'actors' | 'movements' | 'performanceActors'
          name: string
        }
        Insert: {
          id?: number
          created_at?: string
          type: 'actors' | 'movements' | 'performanceActors'
          name: string
        }
        Update: {
          id?: number
          created_at?: string
          type?: 'actors' | 'movements' | 'performanceActors'
          name?: string
        }
        Relationships: []
      }
      generation_tasks: {
        Row: {
          id: string
          created_at: string
          user_id: string
          runway_task_id: string | null
          status: string
          initial_metadata: Json
          input_reference_video_url: string | null
          input_character_url: string | null
          output_video_url: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          runway_task_id?: string | null
          status: string
          initial_metadata: Json
          input_reference_video_url?: string | null
          input_character_url?: string | null
          output_video_url?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          runway_task_id?: string | null
          status?: string
          initial_metadata?: Json
          input_reference_video_url?: string | null
          input_character_url?: string | null
          output_video_url?: string | null
          error_message?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          id: string
          created_at: string
          file_path: string
          actor_name: string
          movement_type: string
          performance_actor: string
          take_number: number
          video_url: string
          thumbnail_url: string | null
          tags: string[] | null
          resolution: Json
          file_size: string
          is_favorite: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          file_path: string
          actor_name: string
          movement_type: string
          performance_actor: string
          take_number: number
          video_url: string
          thumbnail_url?: string | null
          tags: string[]
          resolution: Json
          file_size: string
          is_favorite: boolean
        }
        Update: {
          id?: string
          created_at?: string
          file_path?: string
          actor_name?: string
          movement_type?: string
          performance_actor?: string
          take_number?: number
          video_url?: string
          thumbnail_url?: string | null
          tags?: string[]
          resolution?: Json
          file_size?: string
          is_favorite?: boolean
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
