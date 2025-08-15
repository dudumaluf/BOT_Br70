import { useState, useEffect, useCallback } from 'react';
import { VideoAsset, Category, CategoryType, PerformanceBatch } from '../types';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid'; // We need a UUID library now

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
        const allNewAssets: Omit<VideoAsset, 'id' | 'dateAdded'>[] = [];
        const allFilesToUpload: { file: File, path: string }[] = [];
        const newCategories = new Set<Omit<Category, 'id'>>();
        
        for (const batch of batches) {
            const source = batch.sourceFile;
            
            // Collect new categories to create
            const categoryMap = {
                actors: new Set(categories.filter(c => c.type === 'actors').map(c => c.name)),
                movements: new Set(categories.filter(c => c.type === 'movements').map(c => c.name)),
                performanceActors: new Set(categories.filter(c => c.type === 'performanceActors').map(c => c.name)),
            };
            if (source.performanceActor && !categoryMap.performanceActors.has(source.performanceActor)) newCategories.add({ name: source.performanceActor, type: 'performanceActors' });
            if (source.movementType && !categoryMap.movements.has(source.movementType)) newCategories.add({ name: source.movementType, type: 'movements' });
            if (source.performanceActor && !categoryMap.actors.has(source.performanceActor)) newCategories.add({ name: source.performanceActor, type: 'actors' });

            // Prepare source file upload
            const sourceFilePath = `${userId}/${uuidv4()}-${source.file.name}`;
            allFilesToUpload.push({ file: source.file, path: sourceFilePath });

            // Prepare source asset metadata
            allNewAssets.push({
                filePath: sourceFilePath, actorName: source.performanceActor, movementType: source.movementType,
                performanceActor: source.performanceActor, takeNumber: source.takeNumber,
                videoUrl: '', tags: source.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                resolution: source.resolution, fileSize: `${(source.file.size / 1024 / 1024).toFixed(2)} MB`,
                isFavorite: false,
            });

            // Prepare result files
            for (const result of batch.resultFiles) {
                if (result.actorName && !categoryMap.actors.has(result.actorName)) newCategories.add({ name: result.actorName, type: 'actors' });
                
                const resultFilePath = `${userId}/${uuidv4()}-${result.file.name}`;
                allFilesToUpload.push({ file: result.file, path: resultFilePath });
                
                allNewAssets.push({
                    filePath: resultFilePath, actorName: result.actorName, movementType: source.movementType,
                    performanceActor: source.performanceActor, takeNumber: source.takeNumber,
                    videoUrl: '', tags: source.tags.split(',').map(tag => tag.trim()).filter(Boolean),
                    resolution: result.resolution, fileSize: `${(result.file.size / 1024 / 1024).toFixed(2)} MB`,
                    isFavorite: false,
                });
            }
        }
        
        // 1. Create new categories if any
        if (newCategories.size > 0) {
            const { error: catError } = await supabase.from('categories').insert(Array.from(newCategories));
            if (catError) throw catError;
        }

        // 2. Upload all files in parallel
        await Promise.all(allFilesToUpload.map(({ file, path }) => supabase.storage.from('videos').upload(path, file)));
        
        // 3. Get public URLs for all uploaded files
        const assetsWithUrls = await Promise.all(allNewAssets.map(async (asset) => {
            const { data } = supabase.storage.from('videos').getPublicUrl(asset.filePath);
            return { ...asset, videoUrl: data.publicUrl };
        }));

        // 4. Insert all asset metadata into the database
        const { error: insertError } = await supabase.from('videos').insert(assetsWithUrls);
        if (insertError) throw insertError;
        
        // 5. Refresh all data
        await fetchAllData();
    } catch (error) {
        console.error("Error during upload process:", error);
    } finally {
        setLoading(false);
    }
  }, [userId, categories, fetchAllData]);
  
  const deleteAsset = useCallback(async (assetId: string) => {
    try {
        setAssets(prev => prev.filter(a => a.id !== assetId)); // Optimistic delete
        const { error } = await supabase.from('videos').delete().eq('id', assetId);
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting asset:", error);
        fetchAllData(); // Revert on error
    }
  }, [fetchAllData]);

  const deleteMultipleAssets = useCallback(async (assetIdsToDelete: string[]) => {
    try {
        const idsSet = new Set(assetIdsToDelete);
        setAssets(prev => prev.filter(a => !idsSet.has(a.id))); // Optimistic delete
        const { error } = await supabase.from('videos').delete().in('id', assetIdsToDelete);
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting multiple assets:", error);
        fetchAllData(); // Revert on error
    }
  }, [fetchAllData]);

  const updateAsset = useCallback(async (updatedAsset: VideoAsset) => {
    try {
        const { id, ...updateData } = updatedAsset;
        setAssets(prev => prev.map(a => a.id === id ? updatedAsset : a)); // Optimistic update
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
    updateAsset({ ...asset, isFavorite: !asset.isFavorite });
  }, [assets, updateAsset]);

  // Category Management
  const addCategoryItem = useCallback(async (category: CategoryType, name: string) => {
    if (!name || name.trim() === '') return;
    try {
        const { data, error } = await supabase.from('categories').insert({ type: category, name }).select();
        if (error) throw error;
        setCategories(prev => [...prev, ...data as Category[]].sort((a,b) => a.name.localeCompare(b.name)));
    } catch (error) {
        console.error("Error adding category:", error);
    }
  }, []);
  
  const renameCategoryItem = useCallback(async (categoryToRename: Category, newName: string) => {
    if (!newName || newName.trim() === '' || categoryToRename.name === newName) return;

    if (categories.some(c => c.type === categoryToRename.type && c.name.toLowerCase() === newName.toLowerCase())) {
        alert(`Cannot rename to "${newName}" as it already exists in this category.`);
        return;
    }
    
    try {
        // Update category table
        const { error: catError } = await supabase.from('categories').update({ name: newName }).eq('id', categoryToRename.id);
        if (catError) throw catError;

        // Update all assets using this category
        const keyMap: Record<CategoryType, keyof VideoAsset> = {
            actors: 'actorName', movements: 'movementType', performanceActors: 'performanceActor'
        };
        const assetKey = keyMap[categoryToRename.type];
        const { error: assetError } = await supabase.from('videos').update({ [assetKey]: newName }).eq(assetKey, categoryToRename.name);
        if (assetError) throw assetError;
        
        await fetchAllData();
    } catch (error) {
        console.error("Error renaming category:", error);
    }
  }, [categories, fetchAllData]);

  const deleteCategoryItem = useCallback(async (categoryToDelete: Category) => {
    try {
        const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id);
        if (error) throw error;

        // Un-assign from assets
        const keyMap: Record<CategoryType, keyof VideoAsset> = {
            actors: 'actorName', movements: 'movementType', performanceActors: 'performanceActor'
        };
        const assetKey = keyMap[categoryToDelete.type];
        const { error: assetError } = await supabase.from('videos').update({ [assetKey]: 'Uncategorized' }).eq(assetKey, categoryToDelete.name);
        if (assetError) throw assetError;
        
        await fetchAllData();
    } catch (error) {
        console.error("Error deleting category:", error);
    }
  }, [fetchAllData]);

  return { 
    assets, loading, addAssets, deleteAsset, deleteMultipleAssets, updateAsset, toggleFavorite,
    categories, addCategoryItem, renameCategoryItem, deleteCategoryItem
  };
};