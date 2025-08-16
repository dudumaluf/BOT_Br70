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
          userId: string
          filePath: string
          actorName: string
          movementType: string
          performanceActor: string
          takeNumber: number
          videoUrl: string
          thumbnailUrl: string | null
          tags: string[] | null
          resolution: Json
          fileSize: string
          isFavorite: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          userId: string
          filePath: string
          actorName: string
          movementType: string
          performanceActor: string
          takeNumber: number
          videoUrl: string
          thumbnailUrl?: string | null
          tags: string[]
          resolution: Json
          fileSize: string
          isFavorite: boolean
        }
        Update: {
          id?: string
          created_at?: string
          userId?: string
          filePath?: string
          actorName?: string
          movementType?: string
          performanceActor?: string
          takeNumber?: number
          videoUrl?: string
          thumbnailUrl?: string | null
          tags?: string[]
          resolution?: Json
          fileSize?: string
          isFavorite?: boolean
        }
      }
      categories: {
        Row: {
          id: number
          created_at: string
          userId: string
          type: 'actors' | 'movements' | 'performanceActors'
          name: string
        }
        Insert: {
          id?: number
          created_at?: string
          userId: string
          type: 'actors' | 'movements' | 'performanceActors'
          name: string
        }
        Update: {
          id?: number
          created_at?: string
          userId?: string
          type?: 'actors' | 'movements' | 'performanceActors'
          name?: string
        }
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
