
import { useState, useEffect, useCallback } from 'react';
import { VideoAsset, Category, CategoryType, PerformanceBatch, GenerationTask } from '../types';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../lib/database.types';

export const useAppData = (userId?: string) => {
  const [assets, setAssets] = useState<VideoAsset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        { data: videosData, error: videosError },
        { data: categoriesData, error: categoriesError },
        { data: tasksData, error: tasksError }
      ] = await Promise.all([
        supabase.from('videos').select('*').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('generation_tasks').select('*').order('created_at', { ascending: false })
      ]);

      if (videosError) throw videosError;
      if (categoriesError) throw categoriesError;
      if (tasksError) throw tasksError;

      setAssets((videosData as any[])?.map((v: any) => ({
          ...v,
          tags: v.tags ?? [],
          thumbnail_url: v.thumbnail_url ?? undefined,
          resolution: v.resolution as { width: number; height: number }
      })) ?? []);
      
      setCategories((categoriesData as any[]) ?? []);
      setGenerationTasks((tasksData as any[]) ?? []);

    } catch (error) {
      console.error("Error fetching data from Supabase:", error);
      setAssets([]);
      setCategories([]);
      setGenerationTasks([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId, fetchAllData]);
  
  // Asset Management
  const addAssets = useCallback(async (batches: PerformanceBatch[]) => {
    if (!userId) return;
    setLoading(true);
    try {
        const allFilesToUpload: { file: File, path: string }[] = [];
        const newAssetsData = [];
        
        const newCategories = new Map<string, Omit<Category, 'id' | 'created_at'>>();

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

            addCategoryIfNeeded(source.performance_actor, 'performanceActors');
            addCategoryIfNeeded(source.movement_type, 'movements');
            addCategoryIfNeeded(source.performance_actor, 'actors');

            const sourceFilePath = `${userId}/${uuidv4()}-${source.file.name}`;
            allFilesToUpload.push({ file: source.file, path: sourceFilePath });
            
            newAssetsData.push({
                file_path: sourceFilePath,
                actor_name: source.performance_actor, // Source video is performed by the performance actor
                movement_type: source.movement_type,
                performance_actor: source.performance_actor,
                take_number: source.take_number,
                tags: source.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                resolution: source.resolution,
                file_size: `${(source.file.size / 1024 / 1024).toFixed(2)} MB`,
                is_favorite: false,
            });

            for (const result of batch.resultFiles) {
                addCategoryIfNeeded(result.actor_name, 'actors');
                
                const resultFilePath = `${userId}/${uuidv4()}-${result.file.name}`;
                allFilesToUpload.push({ file: result.file, path: resultFilePath });

                newAssetsData.push({
                    file_path: resultFilePath,
                    actor_name: result.actor_name,
                    movement_type: source.movement_type,
                    performance_actor: source.performance_actor,
                    take_number: source.take_number,
                    tags: source.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                    resolution: result.resolution,
                    file_size: `${(result.file.size / 1024 / 1024).toFixed(2)} MB`,
                    is_favorite: false,
                });
            }
        }
        
        if (newCategories.size > 0) {
            const categoriesToInsert = Array.from(newCategories.values());
            const { error: catError } = await supabase.from('categories').insert(categoriesToInsert as Database['public']['Tables']['categories']['Insert'][]);
            if (catError) throw catError;
        }

        await Promise.all(allFilesToUpload.map(({ file, path }) => supabase.storage.from('videos').upload(path, file)));
        
        const assetsWithUrls = await Promise.all(newAssetsData.map(async (asset) => {
            const { data } = supabase.storage.from('videos').getPublicUrl(asset.file_path);
            return { ...asset, video_url: data.publicUrl };
        }));

        const { error: insertError } = await supabase.from('videos').insert(assetsWithUrls as Database['public']['Tables']['videos']['Insert'][]);
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

        if (assetToDelete?.file_path) {
            const { error: deleteStorageError } = await supabase.storage.from('videos').remove([assetToDelete.file_path]);
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
        const filePathsToDelete = assetsToDelete.map(a => a.file_path).filter(Boolean);

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
        const { id, created_at, file_path, video_url, ...updateData } = updatedAsset;
        setAssets(prev => prev.map(a => a.id === id ? updatedAsset : a));

        const { error } = await supabase.from('videos').update(updateData as Database['public']['Tables']['videos']['Update']).eq('id', id);
        if (error) throw error;
    } catch(error) {
        console.error("Error updating asset:", error);
        fetchAllData();
    }
  }, [fetchAllData]);

  const toggleFavorite = useCallback(async (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, is_favorite: !a.is_favorite } : a));
    
    const { error } = await supabase
      .from('videos')
      .update({ is_favorite: !asset.is_favorite } as Database['public']['Tables']['videos']['Update'])
      .eq('id', assetId);

    if (error) {
        console.error("Error toggling favorite:", error);
        fetchAllData(); // Revert on error
    }
  }, [assets, fetchAllData]);

  // Generation Task Management
  const createGenerationTask = useCallback(async (taskData: Omit<GenerationTask, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('generation_tasks').insert([taskData] as Database['public']['Tables']['generation_tasks']['Insert'][]).select().single();
    if (error) {
      console.error('Error creating generation task:', error);
      return null;
    }
    const newTask = data as any as GenerationTask;
    setGenerationTasks(prev => [newTask, ...prev]);
    return newTask;
  }, []);

  const deleteGenerationTask = useCallback(async (taskId: string) => {
    const taskToDelete = generationTasks.find(t => t.id === taskId);
    setGenerationTasks(prev => prev.filter(t => t.id !== taskId));
    
    // Attempt to cancel the task on Runway's end via our backend proxy
    if (taskToDelete?.runway_task_id && (taskToDelete.status === 'PENDING' || taskToDelete.status === 'RUNNING')) {
      try {
        const response = await fetch(`/api/runway?taskId=${taskToDelete.runway_task_id}`, {
          method: 'DELETE',
        });
        // Runway API returns 404 if the task is already completed/deleted, which is not an error for us.
        if (!response.ok && response.status !== 404) {
            console.warn(`Failed to cancel Runway task ${taskToDelete.runway_task_id}. Status: ${response.status}`);
        }
      } catch (e) {
        console.error("Error calling backend to cancel Runway task:", e);
      }
    }
    
    // Delete the task from our database
    const { error } = await supabase.from('generation_tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Error deleting generation task from DB:', error);
      fetchAllData(); // Revert UI on error
    }

    // Clean up associated files from storage
    const pathsToDelete = [taskToDelete?.input_character_url, taskToDelete?.input_reference_video_url]
      .filter(Boolean)
      .map(url => new URL(url as string).pathname.split('/videos/')[1]);
      
    if (pathsToDelete.length > 0) {
        await supabase.storage.from('videos').remove(pathsToDelete);
    }
  }, [generationTasks, fetchAllData]);
  
  const saveGeneratedVideoToGallery = useCallback(async (
    task: GenerationTask,
    finalMetadata: { actor_name: string, tags: string[] }
  ) => {
    if (!userId || !task.output_video_url) return;
    try {
      // 1. Fetch video from Runway URL
      const response = await fetch(task.output_video_url);
      if (!response.ok) throw new Error(`Failed to fetch video from Runway: ${response.statusText}`);
      const videoBlob = await response.blob();
      const filename = `${task.initial_metadata.performance_actor}_${task.initial_metadata.movement_type}_${finalMetadata.actor_name}.mp4`;
      const videoFile = new File([videoBlob], filename, { type: 'video/mp4' });

      // 2. Get video dimensions
      const tempVideo = document.createElement('video');
      const videoObjectURL = URL.createObjectURL(videoFile);
      const dimensions = await new Promise<{width: number, height: number}>(resolve => {
        tempVideo.onloadedmetadata = () => {
          resolve({ width: tempVideo.videoWidth, height: tempVideo.videoHeight });
          URL.revokeObjectURL(videoObjectURL);
        };
        tempVideo.src = videoObjectURL;
      });

      // 3. Upload to our Supabase bucket
      const filePath = `${userId}/${uuidv4()}-${videoFile.name}`;
      const { error: uploadError } = await supabase.storage.from('videos').upload(filePath, videoFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('videos').getPublicUrl(filePath);

      // 4. Create new asset in 'videos' table
      const newAssetData: Database['public']['Tables']['videos']['Insert'] = {
        ...(task.initial_metadata as any),
        actor_name: finalMetadata.actor_name,
        tags: finalMetadata.tags,
        file_path: filePath,
        video_url: urlData.publicUrl,
        file_size: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`,
        resolution: dimensions,
        is_favorite: false,
      };
      
      const { error: insertError } = await supabase.from('videos').insert([newAssetData] as Database['public']['Tables']['videos']['Insert'][]);
      if (insertError) throw insertError;
      
      // 5. Delete the completed task and refresh data
      await deleteGenerationTask(task.id);
      await fetchAllData();
    } catch(error) {
      console.error("Error saving generated asset to gallery:", error);
    }
  }, [userId, fetchAllData, deleteGenerationTask]);

  // Category Management
  const addCategoryItem = useCallback(async (category: CategoryType, name: string) => {
    if (!name || name.trim() === '' || !userId) return;
    try {
        const { data, error } = await supabase.from('categories').insert([{ type: category, name }] as Database['public']['Tables']['categories']['Insert'][]).select();
        if (error) throw error;
        if (data) {
            setCategories(prev => [...prev, ...(data as any[])].sort((a,b) => a.name.localeCompare(b.name)));
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
        const { error: catError } = await supabase.from('categories').update({ name: newName } as Database['public']['Tables']['categories']['Update']).eq('id', categoryToRename.id);
        if (catError) throw catError;

        const keyMap: Record<CategoryType, 'actor_name' | 'movement_type' | 'performance_actor'> = {
            actors: 'actor_name', movements: 'movement_type', performanceActors: 'performance_actor'
        };
        const assetKey = keyMap[categoryToRename.type];
        if (assetKey) {
          let updatePayload: Database['public']['Tables']['videos']['Update'] = {};
          if(assetKey === 'actor_name') updatePayload.actor_name = newName;
          else if(assetKey === 'movement_type') updatePayload.movement_type = newName;
          else if(assetKey === 'performance_actor') updatePayload.performance_actor = newName;
          
          const { error: assetError } = await supabase.from('videos').update(updatePayload as Database['public']['Tables']['videos']['Update']).eq(assetKey, categoryToRename.name);
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
          let updatePayload: Database['public']['Tables']['videos']['Update'] = {};
          if(assetKey === 'actor_name') updatePayload.actor_name = 'Uncategorized';
          else if(assetKey === 'movement_type') updatePayload.movement_type = 'Uncategorized';
          else if(assetKey === 'performance_actor') updatePayload.performance_actor = 'Uncategorized';
          
          const { error: assetError } = await supabase.from('videos').update(updatePayload as Database['public']['Tables']['videos']['Update']).eq(assetKey, categoryToDelete.name);
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
    generationTasks, createGenerationTask, deleteGenerationTask, saveGeneratedVideoToGallery,
    refreshData: fetchAllData,
  };
};
