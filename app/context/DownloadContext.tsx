// context/DownloadContext.js
import React, { createContext, useContext, useState } from 'react';
import DownloadManager from '../services/DownloadManager';

const DownloadContext = createContext();

export const DownloadProvider = ({ children }) => {
  const [activeDownloads, setActiveDownloads] = useState([]);

  const updateDownloads = () => {
    setActiveDownloads(DownloadManager.getActiveDownloads());
  };

  return (
    <DownloadContext.Provider value={{ activeDownloads, updateDownloads }}>
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownloads = () => useContext(DownloadContext);