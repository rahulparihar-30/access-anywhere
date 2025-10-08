// screens/Files.js
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
import { Menu, Provider, Button } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useNavigation, useLocalSearchParams } from "expo-router";
import { useDownloads } from "../context/DownloadContext";

export default function Files() {
  const [files, setFiles] = useState([]);
  const [navigationStack, setNavigationStack] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const { serverUrl } = useLocalSearchParams();
  const navigation = useNavigation();
  const { downloads, startDownload } = useDownloads();

  // Fetch files from server
  const fetchFiles = async (path = "") => {
    try {
      const url = path
        ? `${serverUrl}/list?path=${encodeURIComponent(path)}`
        : `${serverUrl}/home`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch files");

      const data = await response.json();

      if (!Array.isArray(data)) throw new Error("Invalid server response");

      return data
        .filter((file) => !file.name.startsWith("."))
        .map((file) => ({
          id: `${path}/${file.name}`,
          name: file.name,
          type: file.is_dir ? "folder" : "file",
          is_dir: file.is_dir,
          path: path ? `${path}/${file.name}` : file.name,
        }));
    } catch (error) {
      console.error("Error fetching files:", error);
      Alert.alert("Error", "Failed to fetch files from server.");
      return [];
    }
  };

  // Load initial files
  const loadInitialFiles = async () => {
    const initialFiles = await fetchFiles();
    setFiles(initialFiles);
  };

  // Navigate into folder
  const openFolder = async (folder) => {
    const folderContents = await fetchFiles(folder.path);
    setNavigationStack([
      ...navigationStack,
      { ...folder, contents: folderContents },
    ]);
  };

  // Handle file download via context
  const downloadFile = async (file) => {
    try {
      setMenuVisible(false);
      await startDownload(file, serverUrl);
      Alert.alert("Download Started", `${file.name} is downloading...`);
    } catch (error) {
      console.error("Download failed:", error);
      Alert.alert("Download Failed", "Could not download file.");
    }
  };

  // Open file via URL
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
    if (item.is_dir) openFolder(item);
    else openFile(item);
  };

  const goBack = () => {
    if (navigationStack.length > 0)
      setNavigationStack(navigationStack.slice(0, -1));
  };

  const handleMenuOpen = (file) => {
    setSelectedFile(file);
    setMenuVisible(true);
  };

  // Get current files to display
  const currentFiles =
    navigationStack.length > 0
      ? navigationStack[navigationStack.length - 1].contents
      : files;

  // Get download progress for a file
  const getFileProgress = (file) => {
    const download = downloads.find((d) => d.fileName === file.name);
    return download ? download.progress * 100 : 0;
  };

  // Get icon based on file type
  const getFileIcon = (file) => {
    if (file.is_dir) return "folder";
    const ext = file.name.split(".").pop().toLowerCase();
    switch (ext) {
      case "pdf":
        return "document-text";
      case "jpg":
      case "jpeg":
      case "png":
        return "image";
      case "mp4":
      case "mov":
        return "videocam";
      default:
        return "document";
    }
  };

  useEffect(() => {
    navigation.setOptions({
      title:
        navigationStack.length > 0
          ? navigationStack[navigationStack.length - 1].name
          : "Files",
      headerLeft: () =>
        navigationStack.length > 0 && (
          <TouchableOpacity onPress={goBack} style={{ marginRight: 20 }}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        ),
    });
    loadInitialFiles();
  }, [navigation, navigationStack]);

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
                  name={getFileIcon(item)}
                  size={24}
                  color={item.is_dir ? "#D28C21" : "#555"}
                />
                <Text style={styles.itemText}>{item.name}</Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {getFileProgress(item) > 0 &&
                  getFileProgress(item) < 100 && (
                    <View style={styles.progressBarSmall}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${getFileProgress(item)}%` },
                        ]}
                      />
                    </View>
                  )}
                <Button onPress={() => handleMenuOpen(item)}>⋮</Button>
              </View>
            </TouchableOpacity>
          )}
        />

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={{ x: 0, y: 0 }}
        >
          <Menu.Item
            onPress={() => downloadFile(selectedFile)}
            title="Download"
          />
          {!selectedFile?.is_dir && (
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                openFile(selectedFile);
              }}
              title="Open"
            />
          )}
        </Menu>
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    justifyContent: "space-between",
  },
  itemContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  itemText: { marginLeft: 15, fontSize: 16, flexShrink: 1 },
  progressBarSmall: {
    height: 6,
    width: 60,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
    marginRight: 8,
  },
  progressFill: { height: "100%", backgroundColor: "#D28C21" },
});
