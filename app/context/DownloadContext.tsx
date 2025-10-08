// context/DownloadContext.js
import React, { createContext, useContext, useState } from 'react';
import DownloadManager from '../services/DownloadManager';

const DownloadContext = createContext();

export const DownloadProvider = ({ children }) => {
  // Track downloads as an array of objects: { fileName, progress, status }
  const [downloads, setDownloads] = useState([]);

  // Start a download and track progress
  const startDownload = async (file, serverUrl) => {
    const existing = downloads.find(d => d.fileName === file.name);
    if (existing) return; // Already downloading

    // Add file to downloads
    setDownloads(prev => [...prev, { fileName: file.name, progress: 0, status: 'downloading' }]);

    try {
      await DownloadManager.startDownload(file, serverUrl, (progress) => {
        setDownloads(prev =>
          prev.map(d =>
            d.fileName === file.name ? { ...d, progress } : d
          )
        );
      });
      // Mark download complete
      setDownloads(prev =>
        prev.map(d =>
          d.fileName === file.name ? { ...d, progress: 1, status: 'completed' } : d
        )
      );
    } catch (error) {
      console.error('Download error:', error);
      setDownloads(prev =>
        prev.map(d =>
          d.fileName === file.name ? { ...d, status: 'error' } : d
        )
      );
    }
  };

  const getActiveDownloads = () => downloads.filter(d => d.status === 'downloading');

  return (
    <DownloadContext.Provider value={{ downloads, getActiveDownloads, startDownload }}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloads = () => useContext(DownloadContext);
