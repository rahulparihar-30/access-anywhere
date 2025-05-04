import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Menu, Button, Dialog, Portal, Provider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useNavigation, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from 'expo-sharing';
import * as Permissions from 'expo-permissions';

export default function Files({}) {
  const [files, setFiles] = useState([]);
  const [navigationStack, setNavigationStack] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameDialogVisible, setRenameDialogVisible] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [fileToRename, setFileToRename] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const { serverUrl } = useLocalSearchParams();

  const navigation = useNavigation();

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${serverUrl}/home`);
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
  
      const data = await response.json();
  
      if (!Array.isArray(data)) {
        console.error("Expected an array but got:", data);
        throw new Error("Invalid data received from server.");
      }
  
      const visibleFiles = data
        .filter((file) => !file.name.startsWith("."))
        .map((file) => ({
          id: file.name,
          name: file.name,
          type: file.is_dir ? "folder" : "file",
          is_dir: file.is_dir,
          is_file: file.is_file,
        }));
  
      setFiles(visibleFiles);
  
    } catch (error) {
      console.error("Error fetching files:", error);
      Alert.alert("Error", "Failed to fetch files from server.");
    }
  };

  const addFolder = () => {
    if (newFolderName.trim() === "") {
      Alert.alert("Error", "Folder name cannot be empty");
      return;
    }
    const newFolder = {
      id: Date.now().toString(),
      name: newFolderName,
      type: "folder",
      contents: [],
    };
    if (navigationStack.length > 0) {
      navigationStack[navigationStack.length - 1].contents.push(newFolder);
      setNavigationStack([...navigationStack]);
    } else {
      setFiles([...files, newFolder]);
    }
    setNewFolderName("");
    setDialogVisible(false);
  };

  const renameFile = () => {
    if (!fileToRename || newFileName.trim() === "") {
      Alert.alert("Error", "File name cannot be empty.");
      return;
    }

    if (navigationStack.length > 0) {
      const currentFolder = navigationStack[navigationStack.length - 1];
      currentFolder.contents = currentFolder.contents.map((f) =>
        f.id === fileToRename.id ? { ...f, name: newFileName } : f
      );
      setNavigationStack([...navigationStack]);
    } else {
      setFiles(
        files.map((f) =>
          f.id === fileToRename.id ? { ...f, name: newFileName } : f
        )
      );
    }

    setRenameDialogVisible(false);
    setFileToRename(null);
    Alert.alert("Renamed", "File has been renamed successfully.");
  };

  const downloadFile = async (file) => {
    try {
      // Request appropriate permissions based on Android version
      let permissionResponse;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        permissionResponse = await MediaLibrary.requestPermissionsAsync();
      } else {
        permissionResponse = await Permissions.askAsync(
          Permissions.MEDIA_LIBRARY,
          Permissions.WRITE_EXTERNAL_STORAGE
        );
      }
  
      if (permissionResponse.status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please allow storage access to download files.'
        );
        return;
      }
  
      // Construct the proper download URL
      const currentPath = navigationStack.length > 0 
        ? navigationStack.map(folder => folder.name).join('/') 
        : '';
      
      const downloadUri = `${serverUrl}/download?path=${encodeURIComponent(
        currentPath ? `${currentPath}/${file.name}` : file.name
      )}`;
  
      const fileName = file.name;
      const fileUri = FileSystem.documentDirectory + fileName;
  
      // Show progress UI
      setShowProgress(true);
  
      // Start downloading with progress callback
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
      
      // Hide progress when done
      setShowProgress(false);
  
      // Save to Media Library (only on Android)
      if (Platform.OS === "android") {
        try {
          const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
          await MediaLibrary.createAlbumAsync("Downloads", asset, false);
        } catch (error) {
          console.warn("Couldn't save to album, saving to downloads directory only");
          // Fallback - the file is already saved to the app's directory
        }
      }
  
      Alert.alert("Download Complete", `File saved as ${fileName}`);
    } catch (error) {
      setShowProgress(false);
      Alert.alert("Download Failed", "An error occurred while downloading the file.");
      console.error("Download Error:", error);
    }
  };

  const openFile = async (item) => {
    if (item.type === "folder") {
      try {
        const currentPath = navigationStack.length > 0 
          ? navigationStack.map(folder => folder.name).join('/') 
          : '';
        
        const path = currentPath ? `${currentPath}/${item.name}` : item.name;
        const response = await fetch(`${serverUrl}/list?path=${encodeURIComponent(path)}`);
        
        if (!response.ok) throw new Error("Failed to fetch folder contents");
        const data = await response.json();
        item.contents = data;
        setNavigationStack([...navigationStack, item]);
      } catch (error) {
        console.error("Failed to open folder:", error);
        Alert.alert("Error", "Could not open the folder.");
      }
    } else {
      try {
        const currentPath = navigationStack.length > 0 
          ? navigationStack.map(folder => folder.name).join('/') 
          : '';
        
        const fileUrl = `${serverUrl}/download?path=${encodeURIComponent(
          currentPath ? `${currentPath}/${item.name}` : item.name
        )}`;
        
        await Linking.openURL(fileUrl);
      } catch (err) {
        console.error("Error opening file:", err);
        Alert.alert("Error", "Could not open the file.");
      }
    }
  };
  
  const getCurrentPath = () => {
    return navigationStack.map(folder => folder.name).join("/");
  };
  
  const goBack = () => {
    setNavigationStack(navigationStack.slice(0, -1));
  };

  const handleMenuOpen = (file) => {
    setSelectedFile(file);
    setMenuVisible(true);
  };

  const hideMenu = () => {
    setSelectedFile(null);
    setMenuVisible(false);
  };

  useEffect(() => {
    navigation.setOptions({
      title:
        navigationStack.length > 0
          ? navigationStack[navigationStack.length - 1].name
          : "Files",
      headerLeft: () =>
        navigationStack.length > 0 ? (
          <TouchableOpacity onPress={goBack} style={{ marginRight: 20 }}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        ) : null,
    });
    fetchFiles();
  }, [navigation, navigationStack]);

  useEffect(() => {
    const checkPermissions = async () => {
      if (Platform.OS === 'android') {
        let permissionResponse;
        if (Platform.Version >= 33) {
          permissionResponse = await MediaLibrary.requestPermissionsAsync();
        } else {
          permissionResponse = await Permissions.askAsync(
            Permissions.MEDIA_LIBRARY,
            Permissions.WRITE_EXTERNAL_STORAGE
          );
        }
  
        if (permissionResponse.status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant storage permissions to download files'
          );
        }
      }
    };
    checkPermissions();
  }, []);
  
  const currentFiles =
    navigationStack.length > 0
      ? navigationStack[navigationStack.length - 1].contents.filter(
          (file) => !file.name.startsWith(".")
        )
      : files;

  return (
    <Provider>
      <View style={styles.container}>
        <FlatList
          keyExtractor={(item, index) =>
            item.id ? item.id.toString() : `${item.name}-${index}`
          }
          data={currentFiles}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemContainer}
              onPress={() => openFile(item)}
            >
              <View style={styles.itemContent}>
                {item.type === "folder" ? (
                  <Ionicons name="folder" size={24} color="#D28C21" />
                ) : (
                  <Ionicons name="document" size={24} color="#555" />
                )}
                <Text style={styles.itemText}>{item.name}</Text>
              </View>
              <Button onPress={() => handleMenuOpen(item)}>⋮</Button>
            </TouchableOpacity>
          )}
        />

        <Menu
          visible={menuVisible}
          onDismiss={hideMenu}
          anchor={{ x: 0, y: 0 }}
        >
          <Menu.Item
            onPress={() => downloadFile(selectedFile)}
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

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setDialogVisible(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", padding: 10 },
  headerText: { fontSize: 18, fontWeight: "bold", marginLeft: 10 },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    justifyContent: "space-between",
  },
  itemContent: { flexDirection: "row", alignItems: "center" },
  itemText: { marginLeft: 10, fontSize: 16 },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#D28C21",
    padding: 15,
    borderRadius: 50,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: "#D28C21",
    marginVertical: 10,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  progressBar: {
    height: 10,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginBottom: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D28C21',
  },
  progressText: {
    fontSize: 14,
    color: '#555',
  },
});