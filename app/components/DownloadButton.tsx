import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Picker } from 'react-native';
import DownloadManager from '../services/DownloadManager';
import { Ionicons } from '@expo/vector-icons';

const DownloadButton = ({ files, serverUrl }) => {
  const [selectedFile, setSelectedFile] = useState(files[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setIsDownloading(true);
    setProgress(0);

    try {
      await DownloadManager.startDownload(selectedFile, serverUrl, (p) => {
        setProgress(p);
      });
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View>
      {/* File selection dropdown */}
      <Picker
        selectedValue={selectedFile.name}
        onValueChange={(itemValue, itemIndex) => setSelectedFile(files[itemIndex])}
        style={styles.picker}
      >
        {files.map((file, idx) => (
          <Picker.Item key={idx} label={`${file.name} (${file.type})`} value={file.name} />
        ))}
      </Picker>

      {/* Download button */}
      <TouchableOpacity onPress={handleDownload} disabled={isDownloading} style={styles.button}>
        <View style={styles.container}>
          {isDownloading ? (
            <>
              <Ionicons name="cloud-download" size={24} color="#888" />
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
            </>
          ) : (
            <Ionicons name="cloud-download-outline" size={24} color="#D28C21" />
          )}
          <Text style={styles.buttonText}>
            {isDownloading ? `${Math.round(progress * 100)}%` : 'Download'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  picker: {
    marginBottom: 8,
  },
  button: {
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D28C21',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
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
  buttonText: {
    marginLeft: 8,
    fontWeight: 'bold',
    color: '#D28C21',
  },
});

export default DownloadButton;
