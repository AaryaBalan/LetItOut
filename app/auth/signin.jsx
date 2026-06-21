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
    View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";

export default function SignIn() {
    const router = useRouter();
    const { signup, loginWithGoogle, isGoogleSignInAvailable } = useAuth();

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        } else if (password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }

        // Confirm password validation
        if (!confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password";
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSignUp = async () => {
        if (!validateForm()) return;

        setLoading(true);
        setErrors({});

        const result = await signup(
            email,
            password,
            displayName.trim() || "Anonymous",
        );

        setLoading(false);

        if (result.success) {
            router.replace("/(tabs)/home");
        } else {
            // Parse Firebase error messages
            let errorMessage = result.error;
            if (errorMessage.includes("email-already-in-use")) {
                setErrors({ email: "This email is already registered" });
            } else if (errorMessage.includes("weak-password")) {
                setErrors({ password: "Password is too weak" });
            } else if (errorMessage.includes("invalid-email")) {
                setErrors({ email: "Invalid email address" });
            } else {
                Alert.alert("Sign Up Failed", errorMessage);
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
                            <Ionicons name="chevron-back" size={28} color="#111827" />
                        </TouchableOpacity>
                        <Text style={styles.appName}>LetItOut</Text>
                        <View style={styles.placeholder} />
                    </View>

                    {/* Main Content */}
                    <View style={styles.content}>
                        <Text style={styles.title}>Join Our Space</Text>
                        <Text style={styles.subtitle}>
                            Start your journey to emotional wellness.
                        </Text>

                        {/* Form Card */}
                        <View style={styles.formCard}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>
                                    FULL NAME{" "}
                                    <Text style={styles.optional}>(OPTIONAL)</Text>
                                </Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your name"
                                    placeholderTextColor="#BDBDBD"
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                    autoCapitalize="words"
                                    autoComplete="name"
                                />
                            </View>

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
                                        if (errors.email)
                                            setErrors({ ...errors, email: null });
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
                                        placeholder="Create a password"
                                        placeholderTextColor="#BDBDBD"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (errors.password)
                                                setErrors({ ...errors, password: null });
                                        }}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoComplete="password-new"
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

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[
                                            styles.passwordInput,
                                            errors.confirmPassword && styles.inputError,
                                        ]}
                                        placeholder="Repeat password"
                                        placeholderTextColor="#BDBDBD"
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            if (errors.confirmPassword)
                                                setErrors({
                                                    ...errors,
                                                    confirmPassword: null });
                                        }}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        autoComplete="password-new"
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeIcon}
                                        onPress={() =>
                                            setShowConfirmPassword(!showConfirmPassword)
                                        }
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? "eye-off" : "eye"}
                                            size={22}
                                            color="#9E9E9E"
                                        />
                                    </TouchableOpacity>
                                </View>
                                {errors.confirmPassword && (
                                    <Text style={styles.errorText}>
                                        {errors.confirmPassword}
                                    </Text>
                                )}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.createButton,
                                    loading && styles.buttonDisabled,
                                ]}
                                onPress={handleSignUp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#111827" />
                                ) : (
                                    <>
                                        <Text style={styles.createButtonText}>
                                            Create Account
                                        </Text>
                                        <Ionicons
                                            name="person-add"
                                            size={20}
                                            color="#111827"
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
                                Already have an account?{" "}
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push("/auth/login")}
                            >
                                <Text style={styles.linkText}>Login</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.heartContainer}>
                            <Ionicons name="heart" size={24} color="#E5E7EB" />
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
        backgroundColor: "#F3F4F6" },
    keyboardView: {
        flex: 1 },
    scrollContent: {
        flexGrow: 1 },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12 },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "flex-start" },
    appName: {
        fontSize: 20,
        fontWeight: '400',
        color: "#111827",
        fontFamily: 'Fredoka-Regular' },
    placeholder: {
        width: 40 },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20 },
    title: {
        fontSize: 42,
        color: "#111827",
        marginBottom: 8,
        fontFamily: 'Frederick' },
    subtitle: {
        fontSize: 16,
        color: "#6B7280",
        marginBottom: 32,
        fontFamily: 'Frederick' },
    formCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3 },
    inputContainer: {
        marginBottom: 20 },
    label: {
        fontSize: 12,
        fontWeight: '400',
        color: "#111827",
        marginBottom: 8,
        letterSpacing: 0.5,
        fontFamily: 'Fredoka-Regular' },
    optional: {
        color: "#9E9E9E",
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular' },
    input: {
        backgroundColor: "#F3F4F6",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 15,
        color: "#111827",
        borderWidth: 1,
        borderColor: "transparent",
        fontFamily: 'Fredoka-Regular' },
    inputError: {
        borderColor: "#EF5350" },
    passwordContainer: {
        position: "relative" },
    passwordInput: {
        backgroundColor: "#F3F4F6",
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingRight: 48,
        fontSize: 15,
        color: "#111827",
        borderWidth: 1,
        borderColor: "transparent",
        fontFamily: 'Fredoka-Regular' },
    eyeIcon: {
        position: "absolute",
        right: 16,
        top: 16 },
    errorText: {
        color: "#EF5350",
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
        fontFamily: 'Fredoka-Regular' },
    createButton: {
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
        elevation: 4 },
    buttonDisabled: {
        opacity: 0.6 },
    createButtonText: {
        color: "#111827",
        fontSize: 16,
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular' },
    dividerContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 24 },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: "#E5E7EB" },
    dividerText: {
        color: "#BDBDBD",
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular' },
    googleButton: {
        backgroundColor: "#FFFFFF",
        borderWidth: 2,
        borderColor: "#E5E7EB",
        paddingVertical: 16,
        borderRadius: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12 },
    googleIconBox: {
        width: 24,
        height: 24,
        backgroundColor: "#E8E8E8",
        borderRadius: 4,
        justifyContent: "center",
        alignItems: "center" },
    googleIcon: {
        fontSize: 14,
        fontWeight: '400',
        color: "#6B7280",
        fontFamily: 'Fredoka-Regular' },
    googleButtonText: {
        color: "#111827",
        fontSize: 16,
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular' },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 32 },
    footerText: {
        color: "#9E9E9E",
        fontSize: 15,
        fontFamily: 'Fredoka-Regular' },
    linkText: {
        color: "#111827",
        fontSize: 15,
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular' },
    heartContainer: {
        alignItems: "center",
        marginTop: 24,
        marginBottom: 20 } });
