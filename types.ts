
export interface VideoAsset {
  id: string;
  userId?: string; // To associate with a Supabase user
  filePath: string; // To locate file in Supabase storage
  actorName: string;
  movementType: string;
  performanceActor: string;
  takeNumber: number;
  videoUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  created_at: string;
  resolution: { width: number; height: number };
  fileSize: string;
  isFavorite: boolean;
}

export type GroupMode = 'none' | 'actorName' | 'movementType' | 'performanceActor';
export type SortBy = 'created_at_desc' | 'created_at_asc' | 'actorName_asc' | 'actorName_desc';

export type AppState = 'grid' | 'preview';
export type PreviewLayout = 'grid' | 'column' | 'row';
export type ZoomLevel = 'fit' | '100%';

export type GroupedVideos = {
  [key: string]: VideoAsset[];
};

export type Theme = 'light' | 'dark';
export type CategoryType = 'actors' | 'movements' | 'performanceActors';
export type Category = { id: number; type: CategoryType; name: string; };

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
  actorName: string;
  movementType: string;
  performanceActor: string;
  takeNumber: number;
  tags: string;
}

export interface StagedResultFile extends StagedFile {
    actorName: string;
}

export interface PerformanceBatch {
    id: string;
    sourceFile: StagedSourceFile;
    resultFiles: StagedResultFile[];
}