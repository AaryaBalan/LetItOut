import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../context/AuthContext";
import "../global.css";

export default function RootLayout() {
    useEffect(() => {
        if (Platform.OS === "android") {
            NavigationBar.setVisibilityAsync("hidden");
        }
    }, []);

    return (
        <SafeAreaProvider>
            <AuthProvider>
                <Stack
                    screenOptions={{
                        headerShown: false,
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="welcome" />
                    <Stack.Screen name="auth/signin" />
                    <Stack.Screen name="auth/login" />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="post/[id]" />
                </Stack>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
