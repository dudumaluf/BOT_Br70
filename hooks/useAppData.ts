
import { useState, useEffect, useCallback } from 'react';
import { VideoAsset, Category, CategoryType, PerformanceBatch } from '../types';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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

      setAssets(videosData.map(v => ({...v, dateAdded: v.created_at, tags: v.tags || []})) as VideoAsset[]);
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
        const allNewAssets: Omit<VideoAsset, 'id' | 'dateAdded' | 'userId' | 'videoUrl' | 'thumbnailUrl'>[] = [];
        const allFilesToUpload: { file: File, path: string }[] = [];
        
        // Use a Map to collect and deduplicate new categories. Key: "type-name"
        const newCategories = new Map<string, Omit<Category, 'id' | 'userId'>>();

        // Create a lookup map of existing categories for efficient checking.
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

            // Collect new categories from source file
            addCategoryIfNeeded(source.performanceActor, 'performanceActors');
            addCategoryIfNeeded(source.movementType, 'movements');
            // A performance actor is also an actor, so add to actors list as well
            addCategoryIfNeeded(source.performanceActor, 'actors');

            // Prepare source file for upload
            const sourceFilePath = `${userId}/${uuidv4()}-${source.file.name}`;
            allFilesToUpload.push({ file: source.file, path: sourceFilePath });
            allNewAssets.push({
                filePath: sourceFilePath,
                actorName: source.performanceActor, // Source video is performed by the performance actor
                movementType: source.movementType,
                performanceActor: source.performanceActor,
                takeNumber: source.takeNumber,
                tags: source.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                resolution: source.resolution,
                fileSize: `${(source.file.size / 1024 / 1024).toFixed(2)} MB`,
                isFavorite: false,
            });

            // Process result files
            for (const result of batch.resultFiles) {
                // Collect new actor category from result file
                addCategoryIfNeeded(result.actorName, 'actors');
                
                // Prepare result file for upload
                const resultFilePath = `${userId}/${uuidv4()}-${result.file.name}`;
                allFilesToUpload.push({ file: result.file, path: resultFilePath });
                allNewAssets.push({
                    filePath: resultFilePath,
                    actorName: result.actorName, // Result video features the AI actor
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
        
        // 1. Insert any new categories into the database
        if (newCategories.size > 0) {
            const categoriesToInsert = Array.from(newCategories.values()).map(cat => ({ ...cat, userId }));
            const { error: catError } = await supabase.from('categories').insert(categoriesToInsert);
            if (catError) throw catError;
        }

        // 2. Upload all video files to storage
        await Promise.all(allFilesToUpload.map(({ file, path }) => supabase.storage.from('videos').upload(path, file)));
        
        // 3. Get public URLs for all uploaded videos
        const assetsWithUrls = await Promise.all(allNewAssets.map(async (asset) => {
            const { data } = supabase.storage.from('videos').getPublicUrl(asset.filePath);
            return { ...asset, videoUrl: data.publicUrl, userId };
        }));

        // 4. Insert all asset metadata into the 'videos' table
        const { error: insertError } = await supabase.from('videos').insert(assetsWithUrls);
        if (insertError) throw insertError;
        
        // 5. Refresh all data to show new assets and categories
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
        const { id, dateAdded, videoUrl, ...updateData } = updatedAsset;
        setAssets(prev => prev.map(a => a.id === id ? updatedAsset : a));
        const { error } = await supabase.from('videos').update(updateData).eq('id', id);
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
      .update({ isFavorite: !asset.isFavorite })
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
        const { data, error } = await supabase.from('categories').insert({ type: category, name, userId }).select();
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

        const keyMap: Record<CategoryType, 'actorName' | 'movementType' | 'performanceActor'> = {
            actors: 'actorName', movements: 'movementType', performanceActors: 'performanceActor'
        };
        const assetKey = keyMap[categoryToRename.type];
        if (assetKey) {
          const updatePayload = { [assetKey]: newName };
          const { error: assetError } = await supabase.from('videos').update(updatePayload).eq(assetKey, categoryToRename.name);
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

        const keyMap: Record<CategoryType, 'actorName' | 'movementType' | 'performanceActor'> = {
            actors: 'actorName', movements: 'movementType', performanceActors: 'performanceActor'
        };
        const assetKey = keyMap[categoryToDelete.type];
        if (assetKey) {
          const updatePayload = { [assetKey]: 'Uncategorized' };
          const { error: assetError } = await supabase.from('videos').update(updatePayload).eq(assetKey, categoryToDelete.name);
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
