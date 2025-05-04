// services/DownloadManager.js
import { downloadFile } from './DownloadService';

class DownloadManager {
  constructor() {
    this.activeDownloads = new Map();
  }

  async startDownload(file, serverUrl) {
    const downloadId = Date.now().toString();
    
    const progressCallback = (progress) => {
      this.activeDownloads.set(downloadId, { ...file, progress });
      // You can emit an event or update context here
    };

    try {
      await downloadFile(file, serverUrl, progressCallback);
      this.activeDownloads.delete(downloadId);
    } catch (error) {
      this.activeDownloads.delete(downloadId);
      throw error;
    }
  }

  getActiveDownloads() {
    return Array.from(this.activeDownloads.values());
  }
}

export default new DownloadManager();