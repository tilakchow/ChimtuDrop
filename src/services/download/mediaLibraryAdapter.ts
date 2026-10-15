// Legacy adapter compatible with Expo Go and standard Expo clients
import * as MediaLibrary from 'expo-media-library/legacy';

export async function requestMediaLibraryPermissions(): Promise<boolean> {
  try {
    if (!MediaLibrary || typeof MediaLibrary.requestPermissionsAsync !== 'function') {
      return false;
    }
    const response = await MediaLibrary.requestPermissionsAsync(true);
    return response.granted;
  } catch (err) {
    console.warn('Error requesting storage permission:', err);
    return false;
  }
}

export async function checkMediaLibraryPermissions(): Promise<boolean> {
  try {
    if (!MediaLibrary || typeof MediaLibrary.getPermissionsAsync !== 'function') {
      return false;
    }
    const permissions = await MediaLibrary.getPermissionsAsync(true);
    return permissions.granted;
  } catch {
    return false;
  }
}

export async function saveToMediaLibrary(uri: string): Promise<void> {
  try {
    if (!MediaLibrary) return;

    if (typeof MediaLibrary.createAssetAsync === 'function') {
      const asset = await MediaLibrary.createAssetAsync(uri);
      if (asset && typeof MediaLibrary.getAlbumAsync === 'function' && typeof MediaLibrary.createAlbumAsync === 'function') {
        try {
          const album = await MediaLibrary.getAlbumAsync('ChimtuDrop');
          if (!album) {
            await MediaLibrary.createAlbumAsync('ChimtuDrop', asset, false);
          } else if (typeof MediaLibrary.addAssetsToAlbumAsync === 'function') {
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          }
        } catch {
          // Album creation is secondary; asset is already registered in device gallery
        }
      }
      return;
    }

    if (typeof MediaLibrary.saveToLibraryAsync === 'function') {
      await MediaLibrary.saveToLibraryAsync(uri);
    }
  } catch (err) {
    console.warn('Could not save to MediaLibrary:', err);
  }
}
