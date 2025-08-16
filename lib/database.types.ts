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