import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
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
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="leaf" size={24} color="#7C3AED" />
                    </View>
                    <Text style={styles.appName}>LetItOut</Text>
                    <View style={styles.profileContainer}>
                        <Ionicons
                            name="person-circle-outline"
                            size={32}
                            color="#9E9E9E"
                        />
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.content}>
                    {/* Badge */}
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>SAFE & ANONYMOUS</Text>
                    </View>

                    {/* Hero Title */}
                    <View style={styles.heroSection}>
                        <Text style={styles.heroTitle}>
                            You are <Text style={styles.heroHighlight}>not</Text> alone
                        </Text>
                        <Text style={styles.heroSubtitle}>
                            An emotional sanctuary for students. Share your personal
                            struggles and find warmth in a community that cares.
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => router.push("/auth/signin")}
                        >
                            <Text style={styles.primaryButtonText}>Sign In</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => router.push("/auth/login")}
                        >
                            <Text style={styles.secondaryButtonText}>Login</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Feature Badges */}
                    <View style={styles.featuresContainer}>
                        <View style={styles.featureBadge}>
                            <Ionicons
                                name="shield-checkmark"
                                size={16}
                                color="#7C3AED"
                            />
                            <Text style={styles.featureBadgeText}>100% ANONYMOUS</Text>
                        </View>
                        <View style={styles.featureBadge}>
                            <Ionicons name="heart" size={16} color="#EF9A9A" />
                            <Text style={styles.featureBadgeText}>NO JUDGMENT</Text>
                        </View>
                        <View style={styles.featureBadge}>
                            <Ionicons name="lock-closed" size={16} color="#7C3AED" />
                            <Text style={styles.featureBadgeText}>SECURE SPACE</Text>
                        </View>
                    </View>

                    {/* How It Works */}
                    <Text style={styles.sectionTitle}>HOW IT WORKS</Text>

                    <View style={styles.howItWorksSection}>
                        {/* Express */}
                        <View style={styles.workItem}>
                            <View
                                style={[
                                    styles.workIcon,
                                    { backgroundColor: "#F5F3FF" },
                                ]}
                            >
                                <Ionicons name="create" size={24} color="#7C3AED" />
                            </View>
                            <View style={styles.workContent}>
                                <Text style={styles.workTitle}>Express</Text>
                                <Text style={styles.workDescription}>
                                    Write down what&apos;s on your mind. No names, no
                                    profiles, just pure honesty.
                                </Text>
                            </View>
                        </View>

                        {/* Connect */}
                        <View style={styles.workItem}>
                            <View
                                style={[
                                    styles.workIcon,
                                    { backgroundColor: "#FFF7ED" },
                                ]}
                            >
                                <Ionicons
                                    name="chatbubbles"
                                    size={24}
                                    color="#EA580C"
                                />
                            </View>
                            <View style={styles.workContent}>
                                <Text style={styles.workTitle}>Connect</Text>
                                <Text style={styles.workDescription}>
                                    Receive digital hugs and thoughtful replies from
                                    others who understand.
                                </Text>
                            </View>
                        </View>

                        {/* Heal */}
                        <View style={styles.workItem}>
                            <View
                                style={[
                                    styles.workIcon,
                                    { backgroundColor: "#FEFCE8" },
                                ]}
                            >
                                <Ionicons name="sunny" size={24} color="#CA8A04" />
                            </View>
                            <View style={styles.workContent}>
                                <Text style={styles.workTitle}>Heal</Text>
                                <Text style={styles.workDescription}>
                                    Letting it out is the first step toward feeling
                                    lighter and finding peace.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Quote */}
                    <View style={styles.quoteContainer}>
                        <Ionicons name="chatbox-ellipses" size={40} color="#E5E7EB" />
                        <Text style={styles.quoteText}>
                            &ldquo;I finally felt like my feelings were valid. I didn&apos;t have
                            to pretend to be okay here.&rdquo;
                        </Text>
                        <View style={styles.quoteAuthor}>
                            <Ionicons name="person" size={14} color="#7C3AED" />
                            <Text style={styles.quoteAuthorText}>
                                ANONYMOUS STUDENT
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    logoContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#F5F3FF",
        justifyContent: "center",
        alignItems: "center",
    },
    appName: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
        flex: 1,
        textAlign: "center",
    },
    profileContainer: {
        width: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    badge: {
        alignSelf: "center",
        backgroundColor: "#F5F3FF",
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 20,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#7C3AED",
        letterSpacing: 1.2,
    },
    heroSection: {
        marginTop: 24,
        marginBottom: 32,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: "700",
        color: "#111827",
        textAlign: "center",
        marginBottom: 16,
        lineHeight: 42,
    },
    heroHighlight: {
        color: "#7C3AED",
    },
    heroSubtitle: {
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    buttonContainer: {
        gap: 12,
        marginBottom: 32,
    },
    primaryButton: {
        backgroundColor: "#7C3AED",
        paddingVertical: 16,
        borderRadius: 24,
        alignItems: "center",
        shadowColor: "#7C3AED",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    secondaryButton: {
        backgroundColor: "#FFFFFF",
        paddingVertical: 16,
        borderRadius: 24,
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    secondaryButtonText: {
        color: "#4B5563",
        fontSize: 16,
        fontWeight: "600",
    },
    featuresContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 12,
        marginBottom: 40,
    },
    featureBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    featureBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#6B7280",
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#7C3AED",
        textAlign: "center",
        marginBottom: 32,
        letterSpacing: 2,
    },
    howItWorksSection: {
        gap: 32,
        marginBottom: 40,
    },
    workItem: {
        flexDirection: "row",
        gap: 16,
    },
    workIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    workContent: {
        flex: 1,
        justifyContent: "center",
    },
    workTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },
    workDescription: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
    },
    quoteContainer: {
        backgroundColor: "#FFFFFF",
        padding: 24,
        borderRadius: 20,
        alignItems: "center",
        marginTop: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    quoteText: {
        fontSize: 16,
        fontStyle: "italic",
        color: "#4B5563",
        textAlign: "center",
        lineHeight: 26,
        marginTop: 16,
        marginBottom: 16,
    },
    quoteAuthor: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    quoteAuthorText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#7C3AED",
        letterSpacing: 1,
    },
});
