import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
    const router = useRouter();
    const { login, loginWithGoogle, isGoogleSignInAvailable } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            newErrors.email = "Email is required";
        } else if (!emailRegex.test(email)) {
            newErrors.email = "Please enter a valid email";
        }

        // Password validation
        if (!password) {
            newErrors.password = "Password is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoading(true);
        setErrors({});

        const result = await login(email, password);

        setLoading(false);

        if (result.success) {
            router.replace("/(tabs)/home");
        } else {
            // Parse Firebase error messages
            let errorMessage = result.error;
            if (
                errorMessage.includes("user-not-found") ||
                errorMessage.includes("wrong-password") ||
                errorMessage.includes("invalid-credential")
            ) {
                setErrors({ general: "Invalid email or password" });
            } else if (errorMessage.includes("invalid-email")) {
                setErrors({ email: "Invalid email address" });
            } else if (errorMessage.includes("too-many-requests")) {
                Alert.alert("Too Many Attempts", "Please try again later");
            } else {
                Alert.alert("Login Failed", errorMessage);
            }
        }
    };

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        setErrors({});

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
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header with back button */}
                    <View style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Ionicons name="chevron-back" size={28} color="#212121" />
                        </TouchableOpacity>
                        <Text style={styles.appName}>LetItOut</Text>
                        <View style={styles.placeholder} />
                    </View>

                    {/* Main Content */}
                    <View style={styles.content}>
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>
                            Continue your journey to emotional wellness.
                        </Text>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            {errors.general && (
                                <View style={styles.generalErrorContainer}>
                                    <Text style={styles.generalErrorText}>
                                        {errors.general}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>EMAIL ADDRESS</Text>
                                <TextInput
                                    style={[
                                        styles.input,
                                        errors.email && styles.inputError,
                                    ]}
                                    placeholder="your@email.com"
                                    placeholderTextColor="#BDBDBD"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        if (errors.email || errors.general) {
                                            setErrors({
                                                ...errors,
                                                email: null,
                                                general: null,
                                            });
                                        }
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                />
                                {errors.email && (
                                    <Text style={styles.errorText}>{errors.email}</Text>
                                )}
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>PASSWORD</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[
                                            styles.passwordInput,
                                            errors.password && styles.inputError,
                                        ]}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#BDBDBD"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (errors.password || errors.general) {
                                                setErrors({
                                                    ...errors,
                                                    password: null,
                                                    general: null,
                                                });
                                            }
                                        }}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoComplete="password"
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        <Ionicons
                                            name={showPassword ? "eye-off" : "eye"}
                                            size={22}
                                            color="#9E9E9E"
                                        />
                                    </TouchableOpacity>
                                </View>
                                {errors.password && (
                                    <Text style={styles.errorText}>
                                        {errors.password}
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.loginButton,
                                    loading && styles.buttonDisabled,
                                ]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#212121" />
                                ) : (
                                    <>
                                        <Text style={styles.loginButtonText}>Login</Text>
                                        <Ionicons
                                            name="arrow-forward"
                                            size={20}
                                            color="#212121"
                                        />
                                    </>
                                )}
                            </TouchableOpacity>

                            {isGoogleSignInAvailable && (
                                <>
                                    <View style={styles.dividerContainer}>
                                        <View style={styles.divider} />
                                        <Text style={styles.dividerText}>OR</Text>
                                        <View style={styles.divider} />
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.googleButton,
                                            googleLoading && styles.buttonDisabled,
                                        ]}
                                        onPress={handleGoogleSignIn}
                                        disabled={googleLoading || loading}
                                    >
                                        {googleLoading ? (
                                            <ActivityIndicator color="#616161" />
                                        ) : (
                                            <>
                                                <View style={styles.googleIconBox}>
                                                    <Text style={styles.googleIcon}>G</Text>
                                                </View>
                                                <Text style={styles.googleButtonText}>
                                                    Continue with Google
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                Don't have an account?{" "}
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push("/auth/signin")}
                            >
                                <Text style={styles.linkText}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.heartContainer}>
                            <Ionicons name="heart" size={24} color="#E0E0E0" />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "flex-start",
    },
    appName: {
        fontSize: 20,
        fontWeight: "700",
        color: "#212121",
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    title: {
        fontSize: 42,
        fontWeight: "700",
        color: "#212121",
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: "#757575",
        marginBottom: 32,
    },
    formCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    generalErrorContainer: {
        backgroundColor: "#FFEBEE",
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    generalErrorText: {
        color: "#C62828",
        fontSize: 14,
        textAlign: "center",
        fontWeight: "500",
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: "700",
        color: "#212121",
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: "#F5F5F5",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 15,
        color: "#212121",
        borderWidth: 1,
        borderColor: "transparent",
    },
    inputError: {
        borderColor: "#EF5350",
    },
    passwordContainer: {
        position: "relative",
    },
    passwordInput: {
        backgroundColor: "#F5F5F5",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingRight: 48,
        fontSize: 15,
        color: "#212121",
        borderWidth: 1,
        borderColor: "transparent",
    },
    eyeIcon: {
        position: "absolute",
        right: 16,
        top: 16,
    },
    errorText: {
        color: "#EF5350",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
    loginButton: {
        backgroundColor: "#FFD54F",
        paddingVertical: 18,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        gap: 8,
        shadowColor: "#FFC107",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: "#212121",
        fontSize: 16,
        fontWeight: "700",
    },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#E0E0E0",
    },
    dividerText: {
        color: "#BDBDBD",
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: "500",
    },
    googleButton: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: "#E0E0E0",
        paddingVertical: 16,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    googleIconBox: {
        width: 24,
        height: 24,
        backgroundColor: "#E8E8E8",
        borderRadius: 4,
        justifyContent: "center",
        alignItems: "center",
    },
    googleIcon: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#757575",
    },
    googleButtonText: {
        color: "#212121",
        fontSize: 16,
        fontWeight: "600",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 32,
    },
    footerText: {
        color: "#9E9E9E",
        fontSize: 15,
    },
    linkText: {
        color: "#212121",
        fontSize: 15,
        fontWeight: "700",
    },
    heartContainer: {
        alignItems: "center",
        marginTop: 24,
        marginBottom: 20,
    },
});
