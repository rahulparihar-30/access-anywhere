import React, { useState ,useEffect} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  StyleSheet,
  Alert,
  Platform
} from "react-native";
import { Menu, Button, Dialog, Portal, Provider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useNavigation } from "expo-router";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";


export default function Files() {
  const [files, setFiles] = useState([
    { id: "1", name: "Movies", type: "folder", contents: [] },
    { id: "2", name: "Photos", type: "folder", contents: [{ id: "1", name: "flower.jpg", type: "image", uri: "https://drive.google.com/uc?export=download&id=1Ebg8dDSYrvuThVlzW4BTXLfQWrtJJU0c" },
        { id: "2", name: "cat.jpg", type: "image", uri: "https://drive.google.com/uc?export=download&id=1C6vhrWC-7zh1LsejMAh4mjg9NKe9JkTk" },
        { id: "3", name: "music.jpg", type: "image", uri: "https://drive.google.com/uc?export=download&id=1GhTszPmUt4nsyRxmgjkD_2qR4-QJ9vE_" },
        { id: "4", name: "butterfly.jpg", type: "image", uri: "https://drive.google.com/uc?export=download&id=1Ebg8dDSYrvuThVlzW4BTXLfQWrtJJU0c" },] },
    { id: "3", name: "Music", type: "folder", contents: [] },
    { id: "4", name: "My Pic.jpg", type: "image", uri: "https://drive.google.com/uc?export=download&id=1GhTszPmUt4nsyRxmgjkD_2qR4-QJ9vE_" },
    { id: "5", name: "Lajawati Jhar.mp4", type: "video", uri: "https://drive.google.com/uc?export=download&id=1TByHI1gLywy77L5c4Iqpt6EwOjT2JNhq" },
    { id: "6", name: "template.docx", type: "file", uri: "https://via.placeholder.com/50" },
    { id: "7", name: "Sampleaudio.mp3", type: "mp3", uri: "https://drive.google.com/uc?export=download&id=1ApzhKSi92fHY172yY8ubYKQEcrOhH2te" },
  ]);
  const [navigationStack, setNavigationStack] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [renameDialogVisible, setRenameDialogVisible] = useState(false);
const [newFileName, setNewFileName] = useState("");
const [fileToRename, setFileToRename] = useState(null);

  const navigation = useNavigation();

  const addFolder = () => {
    if (newFolderName.trim() === "") {
      Alert.alert("Error", "Folder name cannot be empty");
      return;
    }
    const newFolder = { id: Date.now().toString(), name: newFolderName, type: "folder", contents: [] };
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
        files.map((f) => (f.id === fileToRename.id ? { ...f, name: newFileName } : f))
      );
    }
  
    setRenameDialogVisible(false);
    setFileToRename(null);
    Alert.alert("Renamed", "File has been renamed successfully.");
  };
  
  const downloadFile = async (file) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow storage access to download files.");
        return;
      }
  
      const downloadUri = file.uri; // URL of the file to download
      const fileName = file.name; // Keep original filename
      const fileUri = FileSystem.documentDirectory + fileName; // Save location
  
      // Start downloading
      const { uri } = await FileSystem.downloadAsync(downloadUri, fileUri);
  
      // Save to Media Library (only on Android)
      if (Platform.OS === "android") {
        const asset = await MediaLibrary.createAssetAsync(uri);
        await MediaLibrary.createAlbumAsync("Download", asset, false);
      }
  
      Alert.alert("Download Complete", `File saved as ${fileName}`);
    } catch (error) {
      Alert.alert("Download Failed", "An error occurred while downloading the file.");
      console.error("Download Error:", error);
    }
  };
  
  const deleteFile = (file) => {
    if (navigationStack.length > 0) {
      const currentFolder = navigationStack[navigationStack.length - 1];
      currentFolder.contents = currentFolder.contents.filter((f) => f.id !== file.id);
      setNavigationStack([...navigationStack]);
    } else {
      setFiles(files.filter((f) => f.id !== file.id));
    }
  
    Alert.alert("Deleted", `${file.name} has been deleted.`);
  };
  const showRenameDialog = (file) => {
    setFileToRename(file);
    setNewFileName(file.name);
    setRenameDialogVisible(true);
  };
  
  const openFile = (item) => {
    if (item.type === "folder") {
      setNavigationStack([...navigationStack, item]);
    } else {
      Linking.openURL(item.uri).catch((err) => console.error("Error opening file:", err));
    }
  };

  const goBack = () => {
    setNavigationStack(navigationStack.slice(0, -1));
  };

  const showMenu = (file) => {
    setSelectedFile(file);
    setMenuVisible(true);
  };
  const hideMenu = () => setMenuVisible(false);
  
  useEffect(() => {
    navigation.setOptions({
      title: navigationStack.length > 0 ? navigationStack[navigationStack.length - 1].name : "Files",
      headerLeft: () =>
        navigationStack.length > 0 ? (
          <TouchableOpacity onPress={goBack} style={{ marginRight: 20 }}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        ) : null, // Hide back button if at the root
    });
  }, [navigation, navigationStack]);
  
  return (
    <Provider>
      <View style={styles.container}>
        <FlatList
          data={navigationStack.length > 0 ? navigationStack[navigationStack.length - 1].contents : files}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.itemContainer} onPress={() => openFile(item)}>
              <View style={styles.itemContent}>
                {item.type === "folder" ? (
                  <Ionicons name="folder" size={24} color="#D28C21" />
                ) : (
                  <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                )}
                <Text style={styles.itemText}>{item.name}</Text>
              </View>
              <Menu
                visible={menuVisible && selectedFile?.id === item.id}
                onDismiss={hideMenu}
                anchor={<Button onPress={() => showMenu(item)}>⋮</Button>}
              >
                <Menu.Item onPress={() => downloadFile(selectedFile)} title="Download" />
                <Menu.Item onPress={() => showRenameDialog(selectedFile)} title="Rename" />
                <Menu.Item onPress={() => deleteFile(selectedFile)} title="Delete" />
              </Menu>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />

        <TouchableOpacity style={styles.addButton} onPress={() => setDialogVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>

        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>Enter Folder Name</Dialog.Title>
            <Dialog.Content>
              <TextInput
                placeholder="Folder name"
                value={newFolderName}
                onChangeText={setNewFolderName}
                style={styles.input}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
              <Button onPress={addFolder}>Add</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", padding: 10 },
  headerText: { fontSize: 18, fontWeight: "bold", marginLeft: 10 },
  itemContainer: { flexDirection: "row", alignItems: "center", padding: 10, justifyContent: "space-between" },
  itemContent: { flexDirection: "row", alignItems: "center" },
  itemText: { marginLeft: 10, fontSize: 16 },
  thumbnail: { width: 40, height: 40, borderRadius: 5 },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#D28C21",
    padding: 15,
    borderRadius: 50,
  },
  backButton: { flexDirection: "row", alignItems: "center", padding: 10 },
  backText: { marginLeft: 5, fontSize: 16 },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor:"#D28C21",
    marginVertical: 10,
  },
});
