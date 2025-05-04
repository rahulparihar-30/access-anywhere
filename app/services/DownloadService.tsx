// services/DownloadService.js
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';

export const downloadFile = async (file, serverUrl, onProgress) => {
  const downloadUri = `${serverUrl}/download?path=Downloads/${encodeURIComponent(file.name)}`;
  const fileUri = FileSystem.documentDirectory + file.name;
  
  try {
    // Show initial notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Download started',
        body: `Downloading ${file.name}`,
      },
      trigger: null,
    });

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUri,
      fileUri,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        const progress = totalBytesWritten / totalBytesExpectedToWrite;
        onProgress(progress);
        
        // Update notification
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Download in progress',
            body: `${file.name}: ${Math.round(progress * 100)}%`,
          },
          trigger: null,
        });
      }
    );

    const { uri } = await downloadResumable.downloadAsync();

    // Save to media library
    const asset = await MediaLibrary.createAssetAsync(uri);
    const album = await MediaLibrary.getAlbumAsync('Download');
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync('Download', asset, false);
    }

    // Show completion notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Download complete',
        body: `${file.name} has been downloaded`,
      },
      trigger: null,
    });

    return uri;
  } catch (error) {
    // Show error notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Download failed',
        body: `Failed to download ${file.name}`,
      },
      trigger: null,
    });
    throw error;
  }
};