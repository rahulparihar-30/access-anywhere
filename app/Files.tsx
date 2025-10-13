import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Menu, Button, Provider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useNavigation, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

export default function Files() {
  const [files, setFiles] = useState([]);
  const [navigationStack, setNavigationStack] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const { serverUrl } = useLocalSearchParams();

  const navigation = useNavigation();

  const fetchFiles = async (path = "") => {
    try {
      const url = path 
        ? `${serverUrl}/list?path=${encodeURIComponent(path)}` 
        : `${serverUrl}/home`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch files");

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid data received from server.");
      }

      const visibleFiles = data
        .filter((file) => !file.name.startsWith("."))
        .map((file) => ({
          id: `${path}/${file.name}`,
          name: file.name,
          type: file.is_dir ? "folder" : "file",
          is_dir: file.is_dir,
          path: path ? `${path}/${file.name}` : file.name,
        }));

      return visibleFiles;
    } catch (error) {
      console.error("Error fetching files:", error);
      Alert.alert("Error", "Failed to fetch files from server.");
      return [];
    }
  };

  const loadInitialFiles = async () => {
    const initialFiles = await fetchFiles();
    setFiles(initialFiles);
  };

  const openFolder = async (folder) => {
    try {
      const folderContents = await fetchFiles(folder.path);
      setNavigationStack([...navigationStack, {
        ...folder,
        contents: folderContents
      }]);
    } catch (error) {
      console.error("Error opening folder:", error);
      Alert.alert("Error", "Could not open folder.");
    }
  };

  const downloadFile = async (file) => {
    try {
      // Request permissions
      let permissionResponse;
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          permissionResponse = await MediaLibrary.requestPermissionsAsync();
        } else {
          permissionResponse = await Permissions.askAsync(
            Permissions.MEDIA_LIBRARY,
            Permissions.WRITE_EXTERNAL_STORAGE
          );
        }

        if (permissionResponse.status !== 'granted') {
          Alert.alert("Permission Denied", "Storage access is required to download files.");
          return;
        }
      }

      const downloadUri = `${serverUrl}/download?path=${encodeURIComponent(file.path)}`;
      const fileUri = FileSystem.documentDirectory + file.name;

      setShowProgress(true);
      setProgress(0);

      const downloadResult = await FileSystem.downloadAsync(
        downloadUri,
        fileUri,
        {
          progressCallback: (downloadProgress) => {
            const progress = 
              downloadProgress.totalBytesWritten / 
              downloadProgress.totalBytesExpectedToWrite;
            setProgress(progress * 100);
          }
        }
      );

      setShowProgress(false);

      if (Platform.OS === "android") {
        try {
          const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
          await MediaLibrary.createAlbumAsync("Downloads", asset, false);
        } catch (error) {
          console.log("Saved to app directory only:", error);
        }
      }

      Alert.alert("Download Complete", `${file.name} saved successfully`);
    } catch (error) {
      setShowProgress(false);
      console.error("Download failed:", error);
      Alert.alert("Download Failed", "Could not download file.");
    }
  };

  const openFile = async (file) => {
    try {
      const fileUrl = `${serverUrl}/download?path=${encodeURIComponent(file.path)}`;
      await Linking.openURL(fileUrl);
    } catch (err) {
      console.error("Error opening file:", err);
      Alert.alert("Error", "Could not open file.");
    }
  };

  const handleItemPress = (item) => {
    if (item.is_dir) {
      openFolder(item);
    } else {
      openFile(item);
    }
  };

  const goBack = () => {
    if (navigationStack.length > 0) {
      setNavigationStack(navigationStack.slice(0, -1));
    }
  };

  const handleMenuOpen = (file) => {
    setSelectedFile(file);
    setMenuVisible(true);
  };

  useEffect(() => {
    navigation.setOptions({
      title: navigationStack.length > 0
        ? navigationStack[navigationStack.length - 1].name
        : "Files",
      headerLeft: () => (
        navigationStack.length > 0 && (
          <TouchableOpacity onPress={goBack} style={{ marginRight: 20 }}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        )
      ),
    });
    loadInitialFiles();
  }, [navigation, navigationStack]);

  const currentFiles = navigationStack.length > 0
    ? navigationStack[navigationStack.length - 1].contents
    : files;

  return (
    <Provider>
      <View style={styles.container}>
      <FlatList
        data={currentFiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
        // Determine icon based on file type/extension
        let iconName = "document";
        let iconColor = "#555";
        if (item.is_dir) {
          iconName = "folder";
          iconColor = "#D28C21";
        } else {
          const ext = item.name.split('.').pop()?.toLowerCase();
          switch (ext) {
          case "jpg":
          case "jpeg":
          case "png":
          case "gif":
            iconName = "image";
            iconColor = "#4A90E2";
            break;
          case "mp3":
          case "wav":
          case "aac":
            iconName = "musical-notes";
            iconColor = "#8E44AD";
            break;
          case "mp4":
          case "mov":
          case "avi":
          case "mkv":
            iconName = "videocam";
            iconColor = "#E74C3C";
            break;
          case "pdf":
            iconName = "document-text";
            iconColor = "#D32F2F";
            break;
          case "zip":
          case "rar":
          case "7z":
            iconName = "archive";
            iconColor = "#F39C12";
            break;
          case "txt":
          case "md":
            iconName = "document-outline";
            iconColor = "#27AE60";
            break;
          case "doc":
          case "docx":
            iconName = "document-text-outline";
            iconColor = "#2980B9";
            break;
          case "xls":
          case "xlsx":
            iconName = "grid";
            iconColor = "#16A085";
            break;
          case "ppt":
          case "pptx":
            iconName = "easel";
            iconColor = "#E67E22";
            break;
          default:
            iconName = "document";
            iconColor = "#555";
          }
        }
        return (
          <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => handleItemPress(item)}
          onLongPress={() => handleMenuOpen(item)}
          >
          <View style={styles.itemContent}>
            <Ionicons
            name={iconName}
            size={24}
            color={iconColor}
            />
            <Text style={styles.itemText}>{item.name}</Text>
          </View>
          <Button onPress={() => handleMenuOpen(item)}>⋮</Button>
          </TouchableOpacity>
        );
        }}
      />

      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: 0, y: 0 }}
      >
        <Menu.Item
        onPress={() => {
          setMenuVisible(false);
          downloadFile(selectedFile);
        }}
        title="Download"
        />
      </Menu>

      {showProgress && (
        <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
        </View>
      )}
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fff"
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    justifyContent: "space-between"
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  itemText: {
    marginLeft: 15,
    fontSize: 16,
    flexShrink: 1
  },
  progressContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    elevation: 4,
    alignItems: 'center'
  },
  progressBar: {
    height: 10,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginBottom: 5,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D28C21'
  },
  progressText: {
    fontSize: 14,
    color: '#555'
  }
});