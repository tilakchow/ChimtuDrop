import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export async function shareDownloadedFile(fileUri: string, mimeType?: string): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return false;
    }

    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      return false;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: mimeType || (fileUri.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'),
      dialogTitle: 'Share via ChimtuDrop',
    });

    return true;
  } catch (err) {
    console.warn('Error sharing file:', err);
    return false;
  }
}
