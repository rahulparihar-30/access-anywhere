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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemContainer}
              onPress={() => handleItemPress(item)}
              onLongPress={() => handleMenuOpen(item)}
            >
              <View style={styles.itemContent}>
                <Ionicons 
                  name={item.is_dir ? "folder" : "document"} 
                  size={24} 
                  color={item.is_dir ? "#D28C21" : "#555"} 
                />
                <Text style={styles.itemText}>{item.name}</Text>
              </View>
              <Button onPress={() => handleMenuOpen(item)}>⋮</Button>
            </TouchableOpacity>
          )}
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