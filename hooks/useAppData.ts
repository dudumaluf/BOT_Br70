
import { useState, useEffect, useCallback } from 'react';
import { VideoAsset, Category, CategoryType, PerformanceBatch } from '../types';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../lib/database.types';

// Mapper to convert snake_case from Supabase to camelCase for the app
const mapSupabaseVideoToAsset = (video: Database['public']['Tables']['videos']['Row']): VideoAsset => ({
  id: video.id,
  created_at: video.created_at,
  userId: video.user_id,
  filePath: video.file_path,
  actorName: video.actor_name,
  movementType: video.movement_type,
  performanceActor: video.performance_actor,
  takeNumber: video.take_number,
  videoUrl: video.video_url,
  thumbnailUrl: video.thumbnail_url ?? undefined,
  tags: video.tags || [],
  resolution: video.resolution as { width: number, height: number },
  fileSize: video.file_size,
  isFavorite: video.is_favorite,
});


export const useAppData = (userId?: string) => {
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (videosError) throw videosError;

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (categoriesError) throw categoriesError;

      setAssets(videosData.map(mapSupabaseVideoToAsset));
      setCategories(categoriesData as Category[]);

    } catch (error) {
      console.error("Error fetching data from Supabase:", error);
      setAssets([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);
  
  // Asset Management
  const addAssets = useCallback(async (batches: PerformanceBatch[]) => {
    if (!userId) return;
    setLoading(true);
    try {
        const allNewAssets: Omit<VideoAsset, 'id' | 'created_at' | 'videoUrl' | 'thumbnailUrl'>[] = [];
        const allFilesToUpload: { file: File, path: string }[] = [];
        
        const newCategories = new Map<string, Omit<Category, 'id'>>();

        const existingCategoryMap = {
            actors: new Set(categories.filter(c => c.type === 'actors').map(c => c.name)),
            movements: new Set(categories.filter(c => c.type === 'movements').map(c => c.name)),
            performanceActors: new Set(categories.filter(c => c.type === 'performanceActors').map(c => c.name)),
        };

        const addCategoryIfNeeded = (name: string, type: CategoryType) => {
            if (name && !existingCategoryMap[type].has(name)) {
                const key = `${type}-${name}`;
                if (!newCategories.has(key)) {
                    newCategories.set(key, { name, type });
                }
            }
        };

        for (const batch of batches) {
            const source = batch.sourceFile;

            addCategoryIfNeeded(source.performanceActor, 'performanceActors');
            addCategoryIfNeeded(source.movementType, 'movements');
            addCategoryIfNeeded(source.performanceActor, 'actors');

            const sourceFilePath = `${userId}/${uuidv4()}-${source.file.name}`;
            allFilesToUpload.push({ file: source.file, path: sourceFilePath });
            allNewAssets.push({
                userId,
                filePath: sourceFilePath,
                actorName: source.performanceActor,
                movementType: source.movementType,
                performanceActor: source.performanceActor,
                takeNumber: source.takeNumber,
                tags: source.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                resolution: source.resolution,
                fileSize: `${(source.file.size / 1024 / 1024).toFixed(2)} MB`,
                isFavorite: false,
            });

            for (const result of batch.resultFiles) {
                addCategoryIfNeeded(result.actorName, 'actors');
                
                const resultFilePath = `${userId}/${uuidv4()}-${result.file.name}`;
                allFilesToUpload.push({ file: result.file, path: resultFilePath });
                allNewAssets.push({
                    userId,
                    filePath: resultFilePath,
                    actorName: result.actorName,
                    movementType: source.movementType,
                    performanceActor: source.performanceActor,
                    takeNumber: source.takeNumber,
                    tags: source.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                    resolution: result.resolution,
                    fileSize: `${(result.file.size / 1024 / 1024).toFixed(2)} MB`,
                    isFavorite: false,
                });
            }
        }
        
        if (newCategories.size > 0) {
            const categoriesToInsert = Array.from(newCategories.values());
            const { error: catError } = await supabase.from('categories').insert(categoriesToInsert as any);
            if (catError) throw catError;
        }

        await Promise.all(allFilesToUpload.map(({ file, path }) => supabase.storage.from('videos').upload(path, file)));
        
        const assetsWithUrls = await Promise.all(allNewAssets.map(async (asset) => {
            const { data } = supabase.storage.from('videos').getPublicUrl(asset.filePath);
            return { ...asset, videoUrl: data.publicUrl };
        }));
        
        // Mapper to convert camelCase from the app to snake_case for Supabase
        const assetsToInsert = assetsWithUrls.map(asset => ({
            user_id: asset.userId,
            file_path: asset.filePath,
            actor_name: asset.actorName,
            movement_type: asset.movementType,
            performance_actor: asset.performanceActor,
            take_number: asset.takeNumber,
            video_url: asset.videoUrl,
            tags: asset.tags,
            resolution: asset.resolution,
            file_size: asset.fileSize,
            is_favorite: asset.isFavorite,
        }));

        const { error: insertError } = await supabase.from('videos').insert(assetsToInsert);
        if (insertError) throw insertError;
        
        await fetchAllData();
    } catch (error) {
        console.error("Error during upload process:", error);
    } finally {
        setLoading(false);
    }
  }, [userId, categories, fetchAllData]);
  
  const deleteAsset = useCallback(async (assetId: string) => {
    try {
        const assetToDelete = assets.find(a => a.id === assetId);
        setAssets(prev => prev.filter(a => a.id !== assetId));
        const { error: deleteVideoError } = await supabase.from('videos').delete().eq('id', assetId);
        if (deleteVideoError) throw deleteVideoError;

        if (assetToDelete?.filePath) {
            const { error: deleteStorageError } = await supabase.storage.from('videos').remove([assetToDelete.filePath]);
            if (deleteStorageError) console.error("Error deleting file from storage:", deleteStorageError);
        }

    } catch (error) {
        console.error("Error deleting asset:", error);
        fetchAllData();
    }
  }, [assets, fetchAllData]);

  const deleteMultipleAssets = useCallback(async (assetIdsToDelete: string[]) => {
    try {
        const idsSet = new Set(assetIdsToDelete);
        const assetsToDelete = assets.filter(a => idsSet.has(a.id));
        const filePathsToDelete = assetsToDelete.map(a => a.filePath).filter(Boolean);

        setAssets(prev => prev.filter(a => !idsSet.has(a.id)));
        
        const { error: deleteVideoError } = await supabase.from('videos').delete().in('id', assetIdsToDelete);
        if (deleteVideoError) throw deleteVideoError;

        if (filePathsToDelete.length > 0) {
            const { error: deleteStorageError } = await supabase.storage.from('videos').remove(filePathsToDelete);
             if (deleteStorageError) console.error("Error deleting multiple files from storage:", deleteStorageError);
        }
    } catch (error) {
        console.error("Error deleting multiple assets:", error);
        fetchAllData();
    }
  }, [assets, fetchAllData]);

  const updateAsset = useCallback(async (updatedAsset: VideoAsset) => {
    try {
        const { id, ...updateData } = updatedAsset;
        setAssets(prev => prev.map(a => a.id === id ? updatedAsset : a));

        const supabaseUpdateData = {
          actor_name: updateData.actorName,
          movement_type: updateData.movementType,
          performance_actor: updateData.performanceActor,
          take_number: updateData.takeNumber,
          tags: updateData.tags,
          is_favorite: updateData.isFavorite,
        };

        const { error } = await supabase.from('videos').update(supabaseUpdateData).eq('id', id);
        if (error) throw error;
    } catch(error) {
        console.error("Error updating asset:", error);
        fetchAllData();
    }
  }, [fetchAllData]);

  const toggleFavorite = useCallback(async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, isFavorite: !a.isFavorite } : a));
    
    const { error } = await supabase
      .from('videos')
      .update({ is_favorite: !asset.isFavorite })
      .eq('id', assetId);

    if (error) {
        console.error("Error toggling favorite:", error);
        fetchAllData(); // Revert on error
    }
  }, [assets, fetchAllData]);

  // Category Management
  const addCategoryItem = useCallback(async (category: CategoryType, name: string) => {
    if (!name || name.trim() === '' || !userId) return;
    try {
        const { data, error } = await supabase.from('categories').insert({ type: category, name }).select();
        if (error) throw error;
        if (data) {
            setCategories(prev => [...prev, ...data as Category[]].sort((a,b) => a.name.localeCompare(b.name)));
        }
    } catch (error) {
        console.error("Error adding category:", error);
    }
  }, [userId]);
  
  const renameCategoryItem = useCallback(async (categoryToRename: Category, newName: string) => {
    if (!newName || newName.trim() === '' || categoryToRename.name === newName) return;

    if (categories.some(c => c.type === categoryToRename.type && c.name.toLowerCase() === newName.toLowerCase())) {
        alert(`Cannot rename to "${newName}" as it already exists in this category.`);
        return;
    }
    
    try {
        const { error: catError } = await supabase.from('categories').update({ name: newName }).eq('id', categoryToRename.id);
        if (catError) throw catError;

        const keyMap: Record<CategoryType, 'actor_name' | 'movement_type' | 'performance_actor'> = {
            actors: 'actor_name', movements: 'movement_type', performanceActors: 'performance_actor'
        };
        const assetKey = keyMap[categoryToRename.type];
        if (assetKey) {
          const updatePayload = { [assetKey]: newName };
          const { error: assetError } = await supabase.from('videos').update(updatePayload as any).eq(assetKey, categoryToRename.name);
          if (assetError) throw assetError;
        }
        
        await fetchAllData();
    } catch (error) {
        console.error("Error renaming category:", error);
    }
  }, [categories, fetchAllData]);

  const deleteCategoryItem = useCallback(async (categoryToDelete: Category) => {
    try {
        const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id);
        if (error) throw error;

        const keyMap: Record<CategoryType, 'actor_name' | 'movement_type' | 'performance_actor'> = {
            actors: 'actor_name', movements: 'movement_type', performanceActors: 'performance_actor'
        };
        const assetKey = keyMap[categoryToDelete.type];
        if (assetKey) {
          const updatePayload = { [assetKey]: 'Uncategorized' };
          const { error: assetError } = await supabase.from('videos').update(updatePayload as any).eq(assetKey, categoryToDelete.name);
          if (assetError) throw assetError;
        }
        
        await fetchAllData();
    } catch (error) {
        console.error("Error deleting category:", error);
    }
  }, [fetchAllData]);

  return { 
    assets, loading, addAssets, deleteAsset, deleteMultipleAssets, updateAsset, toggleFavorite,
    categories, addCategoryItem, renameCategoryItem, deleteCategoryItem,
  };
};
