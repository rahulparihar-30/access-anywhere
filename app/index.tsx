import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { useRouter } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';

export default function HomeScreen() {

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [serverUrl,setServer] = useState("")
  const router = useRouter();

  const onSuccess = (e) => {
    const url = e.data;
    setServer(url);
    // Store the server URL and navigate to file explorer
    navigation.navigate('FileExplorer', { serverUrl: url });
  };

  useEffect(() => {
    async function prepare() {
      await SplashScreen.preventAutoHideAsync();
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 2000); // Adjust timing if needed
    }
    prepare();
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    alert(`Scanned: ${data}`);
    setServer(data)
    fetch(`http://${data}/connect`)
      .then(response => response.json())
      .then(result => console.log("Connected to:", result))
      .catch(error => console.error(error));
    router.push("/Files");
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={styles.camera} // ✅ Ensures the camera fills the 200x200 container
        />
      </View>

      {scanned && <Button title="Scan Again" onPress={() => setScanned(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cameraWrapper: {
    width: 200,
    height: 200,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#000",
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
});

