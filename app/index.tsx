import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
} from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { io, Socket } from "socket.io-client";
import { MaterialIcons } from "@expo/vector-icons";
import * as Notifications from 'expo-notifications';

// Configure notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    (async () => {
      await SplashScreen.preventAutoHideAsync();
      await checkCameraPermission();
      await registerForPushNotifications();
      setupNotificationListeners();
    })();

    return () => {
      // Clean up notification listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get notification permissions');
        return;
      }
    } catch (error) {
      console.error('Error getting notification permissions:', error);
    }
  };

  const setupNotificationListeners = () => {
    // This listener is called when a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // This listener is called when a user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap if needed
    });
  };

  const showNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null, // Send immediately
    });
  };

  const checkCameraPermission = async () => {
    const { status } = await BarCodeScanner.getPermissionsAsync();
    if (status === "granted") {
      setHasPermission(true);
      setIsReady(true);
      await SplashScreen.hideAsync();
    } else {
      await requestCameraPermission();
    }
  };

  const requestCameraPermission = async () => {
    const { status, canAskAgain } = await BarCodeScanner.requestPermissionsAsync();
    if (status === "granted") {
      setHasPermission(true);
      setIsReady(true);
      await SplashScreen.hideAsync();
    } else if (canAskAgain) {
      showPermissionAlert();
    } else {
      // Permission denied forever, open settings
      Alert.alert(
        "Permission Required",
        "Camera access is required. Please enable it in settings.",
        [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Exit App", style: "cancel" },
        ],
        { cancelable: false }
      );
    }
  };

  const showPermissionAlert = () => {
    Alert.alert(
      "Camera Permission Needed",
      "We need access to your camera to scan QR codes.",
      [
        {
          text: "Grant Permission",
          onPress: () => {
            requestCameraPermission();
          },
        },
        {
          text: "Exit App",
          style: "destructive",
        },
      ],
      { cancelable: false }
    );
  };

  const connectToSocket = async (fullUrl: string) => {
    setConnecting(true);
    setConnectionFailed(false);
    
    // Show connecting notification
    await showNotification("Connecting", "Attempting to connect to server...");

    const socket = io(fullUrl, {
      transports: ["websocket"],
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ Connected to server via Socket.IO");
      socket.emit("client_connected", { message: "Hello from mobile!" });
      setConnecting(false);
      
      // Show success notification
      showNotification("Connected", "Successfully connected to server!");
      
      router.push({ pathname: "/Files", params: { serverUrl: fullUrl } });
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
      showNotification("Disconnected", "Lost connection to server");
    });

    socket.on("server_message", (data) => {
      console.log("📩 Message from server:", data);
      // Show server messages as notifications
      showNotification("Server Message", data.message || "New message from server");
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
      setConnecting(false);
      setConnectionFailed(true);
      
      // Show error notification
      showNotification("Connection Failed", "Could not connect to server");
      
      Alert.alert("Connection Failed", "Could not connect to server.");
    });
  };

  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);
    setServerUrl(data);
    const fullUrl = `http://${data}`;
    
    // Show scanning notification
    showNotification("QR Code Scanned", `Connecting to ${data}`);
    
    connectToSocket(fullUrl);
  };

  const handleRetry = () => {
    if (serverUrl) {
      showNotification("Retrying Connection", `Connecting to ${serverUrl}`);
      connectToSocket(`http://${serverUrl}`);
    }
  };

  if (!isReady) {
    return null; // Nothing until permission check done
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        <BarCodeScanner
          onBarCodeScanned={!scanned ? handleBarCodeScanned : undefined}
          style={styles.camera}
        />
      </View>

      {connecting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#D28C21" />
          <Text style={styles.loadingText}>Connecting to server...</Text>
        </View>
      )}

      {!connecting && connectionFailed && (
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <MaterialIcons name="refresh" size={32} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}

      {scanned && !connecting && !connectionFailed && (
        <TouchableOpacity style={styles.scanAgainButton} onPress={() => setScanned(false)}>
          <MaterialIcons name="refresh" size={32} color="#fff" />
          <Text style={styles.retryText}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff",
  },
  cameraWrapper: {
    width: 250,
    height: 250,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#D28C21",
    marginBottom: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    position: "absolute",
    width: "200%",
    height: "100%",
    resizeMode: "cover",
  },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D28C21",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  retryText: {
    color: "#fff",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  scanAgainButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#999",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
});