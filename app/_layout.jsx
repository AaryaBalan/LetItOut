import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AlertProvider } from "../context/AlertContext";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import "../global.css";

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

function RootLayoutContent() {
    const { isDark } = useTheme();

    const [loaded, error] = useFonts({
        'Ribeye': require('../assets/fonts/Ribeye-Regular.ttf'),
        'AutourOne-Regular': require('../assets/fonts/AutourOne-Regular.ttf'),
        'Frederick': require('../assets/fonts/FrederickatheGreat-Regular.ttf'),
        'Fredoka-Bold': require('../assets/fonts/Fredoka-Bold.ttf'),
        'Fredoka-Regular': require('../assets/fonts/Fredoka-Regular.ttf'),
        'CabinSketch-Bold': require('../assets/fonts/CabinSketch-Bold.ttf'),
    });

    // Hide splash screen as soon as component mounts or fonts resolve
    useEffect(() => {
        SplashScreen.hideAsync().catch(() => { });
    }, [loaded, error]);

    return (
        <AuthProvider>
            <AlertProvider>
                <Stack
                    screenOptions={{
                        headerShown: false
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="welcome" />
                    <Stack.Screen name="auth/signin" />
                    <Stack.Screen name="auth/login" />
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="post/[id]" />
                    <Stack.Screen name="mood/log" />
                    <Stack.Screen name="mood/history" />

                    <Stack.Screen name="mood/journal" />
                    <Stack.Screen name="mood/insights" />
                </Stack>
            </AlertProvider>
            <StatusBar style={isDark ? "light" : "dark"} />
        </AuthProvider>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <RootLayoutContent />
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
