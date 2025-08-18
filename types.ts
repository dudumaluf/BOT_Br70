

export interface VideoAsset {
  id: string;
  file_path: string;
  actor_name: string;
  movement_type: string;
  performance_actor: string;
  take_number: number;
  video_url: string;
  thumbnail_url?: string;
  tags: string[];
  created_at: string;
  resolution: { width: number; height: number };
  file_size: string;
  is_favorite: boolean;
}

export type GroupMode = 'none' | 'actor_name' | 'movement_type' | 'performance_actor';
export type SortBy = 'created_at_desc' | 'created_at_asc' | 'actor_name_asc' | 'actor_name_desc';

export type AppState = 'grid' | 'preview';
export type PreviewLayout = 'grid' | 'column' | 'row';
export type ZoomLevel = 'fit' | '100%';

export type GroupedVideos = {
  [key: string]: VideoAsset[];
};

export type Theme = 'light' | 'dark';
export type CategoryType = 'actors' | 'movements' | 'performanceActors';
export type Category = { id: number; type: CategoryType; name: string; created_at: string; };

export interface Settings {
  autoplayOnHover: boolean;
}

// Upload-related types, now centralized
export interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
  resolution: { width: number; height: number };
}

export interface StagedSourceFile extends StagedFile {
  actor_name: string;
  movement_type: string;
  performance_actor: string;
  take_number: number;
  tags: string;
}

export interface StagedResultFile extends StagedFile {
    actor_name: string;
}

export interface PerformanceBatch {
    id: string;
    sourceFile: StagedSourceFile;
    resultFiles: StagedResultFile[];
}

// Generator-related types
export type RunwayTaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ARCHIVED' | 'UPLOADING';

export interface GenerationTask {
  id: string; // Supabase DB id
  created_at: string;
  user_id: string;
  runway_task_id: string | null;
  status: RunwayTaskStatus;
  initial_metadata: {
    performance_actor: string;
    movement_type: string;
    take_number: number;
    tags: string[];
    character_asset_name: string;
    reference_video_name: string;
  };
  input_reference_video_url: string | null;
  input_character_url: string | null;
  output_video_url: string | null;
  error_message: string | null;
}
