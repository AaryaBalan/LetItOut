import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export default function Index() {
    const router = useRouter();
    const { user, loading } = useAuth();

    // Auto-redirect authenticated users to home
    useEffect(() => {
        if (!loading && user) {
            router.replace("/(tabs)/home");
        }
    }, [user, loading, router]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

            {/* Background Geometric Shapes */}

            {/* Top Left Yellow Flower (Approximation using intersecting circles) */}
            <View style={styles.shapeYellowFlower}>
                <View style={styles.flowerPetal1} />
                <View style={styles.flowerPetal2} />
                <View style={styles.flowerPetal3} />
                <View style={styles.flowerCenter} />
            </View>

            {/* Top Right Indigo Moon (Approximation using border radius) */}
            <View style={styles.shapeIndigoMoon} />

            {/* Bottom Left Blue Circle */}
            <View style={styles.shapeBlueCircle} />

            {/* Middle Red Star */}
            <View style={styles.shapeRedStar}>
                <Ionicons name="star" size={64} color="#EB5757" />
            </View>

            {/* Bottom Right Green Squiggle */}
            <View style={styles.shapeGreenSquiggle}>
                <Ionicons name="pulse" size={80} color="#27AE60" />
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.textContainer}>
                    <Text style={styles.heroTitle}>
                        Support That's{"\n"}Always Close
                    </Text>
                    <Text style={styles.heroSubtitle}>
                        Anonymous sharing, guidance,{"\n"}and support - all in one place.
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push("/auth/signin")}
                    >
                        <Text style={styles.primaryButtonText}>Get started</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={() => router.push("/auth/login")}
                    >
                        <Text style={styles.loginLinkText}>Already have an account? Log in</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        position: 'relative' },

    // Geometric Shapes Styles
    shapeYellowFlower: {
        position: 'absolute',
        top: 20,
        left: -30,
        width: 140,
        height: 140,
        zIndex: 1 },
    flowerPetal1: {
        position: 'absolute',
        top: 0,
        left: 40,
        width: 70,
        height: 70,
        backgroundColor: '#F2C94C',
        borderRadius: 35 },
    flowerPetal2: {
        position: 'absolute',
        top: 40,
        left: 0,
        width: 70,
        height: 70,
        backgroundColor: '#F2C94C',
        borderRadius: 35 },
    flowerPetal3: {
        position: 'absolute',
        top: 60,
        left: 60,
        width: 80,
        height: 80,
        backgroundColor: '#F2C94C',
        borderRadius: 40 },
    flowerCenter: {
        position: 'absolute',
        top: 30,
        left: 30,
        width: 60,
        height: 60,
        backgroundColor: '#F2C94C' },

    shapeIndigoMoon: {
        position: 'absolute',
        top: 80,
        right: -30,
        width: 120,
        height: 120,
        backgroundColor: '#6366F1',
        borderRadius: 60,
        borderTopRightRadius: 10,
        transform: [{ rotate: '45deg' }],
        zIndex: 1 },

    shapeBlueCircle: {
        position: 'absolute',
        bottom: 120,
        left: -40,
        width: 180,
        height: 180,
        backgroundColor: '#2F80ED',
        borderRadius: 90,
        zIndex: 1 },

    shapeRedStar: {
        position: 'absolute',
        bottom: 260,
        left: 100,
        zIndex: 1 },

    shapeGreenSquiggle: {
        position: 'absolute',
        bottom: 150,
        right: 20,
        zIndex: 1,
        transform: [{ rotate: '-15deg' }] },

    // Content Layout
    contentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: '50%', // Push text to middle-top like image
        zIndex: 10 },
    textContainer: {
        alignItems: 'center' },
    heroTitle: {
        fontSize: 42,
        color: "#111827",
        textAlign: "center",
        marginBottom: 16,
        lineHeight: 48,
        letterSpacing: -1,
        fontFamily: 'Frederick' },
    heroSubtitle: {
        fontSize: 16,
        color: "#111827",
        textAlign: "center",
        lineHeight: 24,
        fontFamily: 'Frederick' },
    buttonContainer: {
        gap: 16,
        width: '100%' },
    primaryButton: {
        backgroundColor: "#111827",
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: "center",
        width: '100%' },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular' },
    loginLink: {
        alignItems: 'center',
        paddingVertical: 10 },
    loginLinkText: {
        color: "#111827",
        fontSize: 14,
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular' } });
