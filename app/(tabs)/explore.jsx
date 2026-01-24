import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function Explore() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");

    const CATEGORIES = [
        {
            id: "Stress",
            name: "STRESS",
            icon: "leaf",
            subtitle: "Finding Peace",
            iconColor: "#7C6BA8",
            bgColor: "#B39DDB",
            decorativeShapes: true,
        },
        {
            id: "Family",
            name: "FAMILY",
            icon: "heart",
            subtitle: "Navigating Relationships",
            iconColor: "#E57373",
            bgColor: "#FFCDD2",
            decorativeShapes: true,
        },
        {
            id: "Mental Health",
            name: "MENTAL HEALTH",
            icon: "fitness",
            subtitle: "Daily Wellbeing",
            iconColor: "#C8A656",
            bgColor: "#FFE082",
            decorativeShapes: true,
        },
        {
            id: "Study",
            name: "STUDY",
            icon: "briefcase",
            subtitle: "Career & Purpose",
            iconColor: "#5FA49C",
            bgColor: "#B2DFDB",
            decorativeShapes: true,
        },
        {
            id: "Relationship",
            name: "RELATIONSHIP",
            icon: "people",
            subtitle: "Love & Connection",
            iconColor: "#F48FB1",
            bgColor: "#FFE8EE",
            decorativeShapes: true,
        },
        {
            id: "Other",
            name: "OTHER",
            icon: "ellipsis-horizontal",
            subtitle: "Share Your Story",
            iconColor: "#90A4AE",
            bgColor: "#ECEFF1",
            decorativeShapes: true,
        },
    ];

    const TRENDING_TAGS = [
        { id: 1, text: "WorkLifeBalance" },
        { id: 2, text: "GriefSupport" },
    ];

    const handleCategoryPress = (id) => {
        router.push(`/community/${id}`);
    };

    const handleSearchFocus = () => {
        // Navigate to search page or show search results
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F8F8" translucent={false} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <View style={styles.exploreHeader}>
                    <Text style={styles.headerTitle}>Explore</Text>
                    <TouchableOpacity style={styles.notificationButton}>
                        <Ionicons name="notifications-outline" size={26} color="#374151" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchRow}>
                    <TouchableOpacity
                        style={styles.searchContainer}
                        onPress={handleSearchFocus}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="search" size={22} color="#9CA3AF" />
                        <Text style={styles.searchPlaceholder}>What's on your mind?</Text>
                    </TouchableOpacity>
                </View>

                {/* Trending Right Now */}
                <View style={styles.trendingSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Trending Right Now</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.trendingTags}>
                        {TRENDING_TAGS.map((tag) => (
                            <TouchableOpacity
                                key={tag.id}
                                style={styles.trendingTag}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.trendingHashtag}>#</Text>
                                <Text style={styles.trendingText}>{tag.text}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Categories */}
                <View style={styles.categoriesSection}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <View style={styles.categoriesGrid}>
                        {CATEGORIES.map((category) => (
                            <TouchableOpacity
                                key={category.id}
                                style={[
                                    styles.categoryCard,
                                    { backgroundColor: category.bgColor }
                                ]}
                                onPress={() => handleCategoryPress(category.id)}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.categoryIconContainer, { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                                    <Ionicons
                                        name={category.icon}
                                        size={28}
                                        color={category.iconColor}
                                    />
                                </View>
                                <Text style={styles.categoryName}>{category.name}</Text>
                                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>

                                {/* Decorative shapes */}
                                {category.decorativeShapes && (
                                    <>
                                        <View style={[styles.decorativeCircle, styles.decorCircle1]} />
                                        <View style={[styles.decorativeCircle, styles.decorCircle2]} />
                                    </>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F8F8"
    },
    scrollContent: {
        paddingBottom: 100,
    },
    exploreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20
    },
    headerTitle: {
        fontSize: 36,
        fontWeight: "700",
        color: "#1F2937"
    },
    notificationButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    searchRow: {
        paddingHorizontal: 20,
        marginBottom: 32,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 30,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchPlaceholder: {
        flex: 1,
        fontSize: 16,
        color: "#9CA3AF"
    },
    trendingSection: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
    },
    seeAllText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#5EBEAA",
    },
    trendingTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
    },
    trendingTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    trendingHashtag: {
        fontSize: 18,
        fontWeight: "700",
        color: "#5EBEAA",
        marginRight: 4,
    },
    trendingText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#1F2937",
    },
    categoriesSection: {
        paddingHorizontal: 20,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    categoryCard: {
        width: '48%',
        aspectRatio: 0.85,
        borderRadius: 24,
        padding: 20,
        justifyContent: 'space-between',
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 16,
    },
    categoryIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryName: {
        fontSize: 13,
        fontWeight: "700",
        color: "#6B7280",
        letterSpacing: 1,
        marginBottom: 4,
    },
    categorySubtitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        lineHeight: 26,
    },
    decorativeCircle: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 1000,
    },
    decorCircle1: {
        width: 80,
        height: 80,
        bottom: -20,
        right: -10,
    },
    decorCircle2: {
        width: 50,
        height: 50,
        bottom: 40,
        right: 60,
    },
});
