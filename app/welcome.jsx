import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export default function Welcome() {
    const router = useRouter();
    const { loginWithGoogle, isGoogleSignInAvailable } = useAuth();
    const [googleLoading, setGoogleLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        if (!isGoogleSignInAvailable) {
            Alert.alert(
                "Google Sign-In Unavailable",
                'Google Sign-In requires a native build. Please use email/password sign-in or rebuild the app with "npx expo run:android"',
                [{ text: "OK" }],
            );
            return;
        }

        setGoogleLoading(true);

        const result = await loginWithGoogle();

        setGoogleLoading(false);

        if (result.success) {
            router.replace("/(tabs)/home");
        } else {
            Alert.alert("Google Sign-In Failed", result.error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.logo}>Let It Out</Text>
                    <Text style={styles.title}>Welcome!</Text>
                    <Text style={styles.subtitle}>
                        Choose how you&apos;d like to get started
                    </Text>
                </View>

                <View style={styles.buttonContainer}>
                    {isGoogleSignInAvailable && (
                        <>
                            <TouchableOpacity
                                style={[
                                    styles.googleButton,
                                    googleLoading && styles.buttonDisabled,
                                ]}
                                onPress={handleGoogleSignIn}
                                disabled={googleLoading}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator color="#1f2937" />
                                ) : (
                                    <>
                                        <View style={styles.googleIconContainer}>
                                            <Text style={styles.googleIcon}>G</Text>
                                        </View>
                                        <Text style={styles.googleButtonText}>
                                            Continue with Google
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <View style={styles.dividerContainer}>
                                <View style={styles.divider} />
                                <Text style={styles.dividerText}>OR</Text>
                                <View style={styles.divider} />
                            </View>
                        </>
                    )}

                    <TouchableOpacity
                        style={styles.signUpButton}
                        onPress={() => router.push("/auth/signin")}
                        disabled={googleLoading}
                    >
                        <Text style={styles.signUpButtonText}>
                            Sign Up with Email
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => router.push("/auth/login")}
                        disabled={googleLoading}
                    >
                        <Text style={styles.loginButtonText}>
                            Already have an account? Log In
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        By continuing, you agree to our Terms of Service and Privacy
                        Policy
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: "space-between",
        paddingVertical: 40,
    },
    header: {
        alignItems: "center",
        marginTop: 40,
    },
    logo: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#6366f1",
        marginBottom: 32,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#1f2937",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: "#6b7280",
        textAlign: "center",
        paddingHorizontal: 20,
    },
    buttonContainer: {
        width: "100%",
    },
    googleButton: {
        backgroundColor: "#ffffff",
        borderWidth: 2,
        borderColor: "#e5e7eb",
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    googleIconContainer: {
        marginRight: 12,
    },
    googleIcon: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#4285f4",
    },
    googleButtonText: {
        color: "#1f2937",
        fontSize: 16,
        fontWeight: "600",
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#e5e7eb",
    },
    dividerText: {
        color: "#9ca3af",
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: "500",
    },
    signUpButton: {
        backgroundColor: "#6366f1",
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 12,
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    signUpButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "bold",
    },
    loginButton: {
        paddingVertical: 16,
        alignItems: "center",
    },
    loginButtonText: {
        color: "#6366f1",
        fontSize: 14,
        fontWeight: "600",
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    footer: {
        paddingHorizontal: 20,
    },
    footerText: {
        fontSize: 12,
        color: "#9ca3af",
        textAlign: "center",
        lineHeight: 18,
    },
});
