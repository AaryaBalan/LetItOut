import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PostCard from "../../components/PostCard";
import { db } from "../../config/firebase";


export default function Explore() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch all posts from Firebase
    useEffect(() => {
        const postsRef = collection(db, "posts");
        const q = query(postsRef);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetchedPosts = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        title: data.title,
                        description: data.description,
                        category: data.category,
                        feelPercentage: data.feelPercentage ?? 50,
                        timestamp: data.createdAt,
                        reactionCount: data.reactionCount || 0,
                        isAnonymous: data.isAnonymous,
                        authorName: data.authorName || "Anonymous",
                        authorId: data.authorId,
                    };
                });
                setPosts(fetchedPosts);
                setLoading(false);
            },
            (error) => {
                console.error("Error fetching posts:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Filter posts based on search query
    const filteredPosts = searchQuery.trim()
        ? posts.filter((post) => {
            const query = searchQuery.toLowerCase();
            return (
                post.title?.toLowerCase().includes(query) ||
                post.description?.toLowerCase().includes(query) ||
                post.category?.toLowerCase().includes(query)
            );
        })
        : [];

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
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={22} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search posts, topics, or categories..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery("")}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Search Results or Categories */}
                {searchQuery.trim() ? (
                    <View style={styles.searchResultsSection}>
                        <Text style={styles.sectionTitle}>
                            {filteredPosts.length > 0
                                ? `${filteredPosts.length} Result${filteredPosts.length !== 1 ? 's' : ''}`
                                : 'No Results Found'}
                        </Text>
                        {filteredPosts.length > 0 ? (
                            <View style={styles.resultsContainer}>
                                {filteredPosts.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </View>
                        ) : (
                            <View style={styles.noResultsContainer}>
                                <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                                <Text style={styles.noResultsText}>No posts found</Text>
                                <Text style={styles.noResultsSubtext}>
                                    Try different keywords or browse categories
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
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
                )}
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
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#1F2937",
        paddingVertical: 0,
    },
    resultsContainer: {
        marginTop: 16,
    },
    noResultsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    noResultsText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 16,
        marginBottom: 8,
    },
    noResultsSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    trendingSection: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
        paddingHorizontal: 20,
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
