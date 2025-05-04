// components/DownloadButton.js
import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import DownloadManager from '../services/DownloadManager';
import { Ionicons } from '@expo/vector-icons';

const DownloadButton = ({ file, serverUrl }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setIsDownloading(true);
    setProgress(0);
    
    try {
      await DownloadManager.startDownload(file, serverUrl, (p) => {
        setProgress(p);
      });
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <TouchableOpacity onPress={handleDownload} disabled={isDownloading}>
      <View style={styles.container}>
        {isDownloading ? (
          <>
            <Ionicons name="cloud-download" size={24} color="#888" />
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${progress * 100}%` }
                ]} 
              />
            </View>
          </>
        ) : (
          <Ionicons name="cloud-download-outline" size={24} color="#D28C21" />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  progressBar: {
    height: 4,
    width: 50,
    backgroundColor: '#ddd',
    marginLeft: 8,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D28C21',
  },
});

export default DownloadButton;