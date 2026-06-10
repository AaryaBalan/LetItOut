import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import "../global.css";

function RootLayoutContent() {
    const { isDark } = useTheme();

    return (
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
            <StatusBar style={isDark ? "light" : "dark"} />
        </AuthProvider>
    );
}

export default function RootLayout() {
    useEffect(() => {
        if (Platform.OS === "android") {
            NavigationBar.setVisibilityAsync("hidden");
        }
    }, []);

    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <RootLayoutContent />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
