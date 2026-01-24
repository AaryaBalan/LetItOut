import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    FlatList,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PostCard from "../../components/PostCard";
import { db } from "../../config/firebase";


export default function Explore() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSort, setSelectedSort] = useState("recent");
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [showFilterModal, setShowFilterModal] = useState(false);

    const CATEGORIES = [
        {
            id: "Family",
            name: "FAMILY",
            icon: "people",
            iconColor: "#F48FB1",
            bgColor: "#FFE8EE",
            gradientColors: ["#F48FB1", "#F06292"],
            quote: "Family isn't always blood. It's the people who love you unconditionally.",
        },
        {
            id: "Stress",
            name: "STRESS",
            icon: "leaf",
            iconColor: "#9B8BC9",
            bgColor: "#E8E4F3",
            gradientColors: ["#B39DDB", "#9575CD"],
            quote: "Take a deep breath. You're doing the best you can, and that's enough.",
        },
        {
            id: "Relationship",
            name: "RELATIONSHIP",
            icon: "heart",
            iconColor: "#F48FB1",
            bgColor: "#FFE8EE",
            gradientColors: ["#F48FB1", "#F06292"],
            quote: "Love and connection are what make life meaningful.",
        },
        {
            id: "Study",
            name: "STUDY",
            icon: "book",
            iconColor: "#80CBC4",
            bgColor: "#E0F2F1",
            gradientColors: ["#80CBC4", "#4DB6AC"],
            quote: "Every expert was once a beginner. Keep learning and growing.",
        },
        {
            id: "Mental Health",
            name: "MENTAL HEALTH",
            icon: "fitness",
            iconColor: "#FFE082",
            bgColor: "#FFF9E6",
            gradientColors: ["#FFE082", "#FFD54F"],
            quote: "Your mental health matters. It's okay to not be okay.",
        },
        {
            id: "Other",
            name: "OTHER",
            icon: "ellipsis-horizontal",
            iconColor: "#B0BEC5",
            bgColor: "#ECEFF1",
            gradientColors: ["#B0BEC5", "#90A4AE"],
            quote: "Every story deserves to be heard. Share what's on your mind.",
        },
    ];

    const SORT_OPTIONS = [
        { id: "recent", name: "Recent", icon: "time-outline" },
        { id: "popular", name: "Popular", icon: "trending-up-outline" },
        { id: "mostCommented", name: "Most Commented", icon: "chatbubbles-outline" },
    ];



    useEffect(() => {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || "",
                    description: data.description || "",
                    category: data.category || "",
                    timestamp: data.createdAt
                        ? getTimeAgo(data.createdAt)
                        : "Just now",
                    isAnonymous: data.isAnonymous,
                    authorName: data.authorName || "Anonymous",
                    authorId: data.authorId,
                    createdAt: data.createdAt,
                    reactions: data.reactions || { like: 0, hug: 0, metoo: 0 },
                    commentCount: data.commentCount || 0,
                    reactionCount: data.reactionCount || 0,
                    helpNeeded: data.helpNeeded || false,
                };
            });
            setPosts(fetched);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let filtered = [...posts];
        if (searchQuery.trim()) {
            const qText = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    p.title.toLowerCase().includes(qText) ||
                    p.description.toLowerCase().includes(qText) ||
                    (p.category || "").toLowerCase().includes(qText),
            );
        }

        // Handle different sort options
        if (selectedSort === "popular") {
            filtered.sort(
                (a, b) => (b.reactionCount || 0) - (a.reactionCount || 0),
            );
        } else if (selectedSort === "mostCommented") {
            filtered.sort(
                (a, b) => (b.commentCount || 0) - (a.commentCount || 0),
            );
        }
        setFilteredPosts(filtered);
    }, [posts, searchQuery, selectedSort]);

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "Just now";
        const now = new Date();
        const postDate = timestamp.toDate
            ? timestamp.toDate()
            : new Date(timestamp);
        const diff = now - postDate;
        const mins = Math.floor(diff / 60000);
        const hrs = Math.floor(mins / 60);
        const days = Math.floor(hrs / 24);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        if (hrs < 24) return `${hrs}h ago`;
        if (days === 1) return "Yesterday";
        return `${days}d ago`;
    };

    const handleCategoryPress = (id) => {
        router.push(`/community/${id}`);
    };

    const renderPost = ({ item }) => (
        <View style={styles.postItemList}>
            <PostCard post={item} hideDescription={true} />
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
            <View style={styles.exploreHeader}>
                <Text style={styles.headerTitle}>Explore</Text>
            </View>

            <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#BDBDBD" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search feelings..."
                        placeholderTextColor="#BDBDBD"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity
                    style={styles.filterIconButton}
                    onPress={() => setShowFilterModal(true)}
                >
                    <Ionicons name="options-outline" size={24} color="#374151" />
                </TouchableOpacity>
            </View>

            <View style={styles.communitiesSection}>
                <Text style={styles.sectionLabel}>COMMUNITY CIRCLES</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesScroll}
                >
                    {CATEGORIES.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={styles.categoryCircle}
                            onPress={() => handleCategoryPress(category.id)}
                            activeOpacity={0.7}
                        >
                            <View
                                style={[
                                    styles.categoryCircleIcon,
                                    { backgroundColor: category.bgColor },
                                ]}
                            >
                                <Ionicons
                                    name={category.icon}
                                    size={28}
                                    color={category.iconColor}
                                />
                            </View>
                            <Text style={styles.categoryCircleLabel}>
                                {category.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.forYouHeader}>
                <Text style={styles.forYouLabel}>FOR YOU</Text>
                <TouchableOpacity style={styles.sortDropdown}>
                    <Text style={styles.sortDropdownText}>MOST RECENT</Text>
                    <Ionicons name="chevron-down" size={16} color="#9B8BC9" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredPosts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.postsGridContainer}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={64} color="#BDBDBD" />
                        <Text style={styles.emptyStateTitle}>No posts found</Text>
                        <Text style={styles.emptyStateText}>
                            Be the first to share your thoughts
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAFAFA" },
    exploreHeader: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    headerTitle: { fontSize: 34, fontWeight: "700", color: "#1F2937" },
    searchRow: {
        flexDirection: "row",
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 20,
    },
    searchContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 10,
    },
    searchInput: { flex: 1, fontSize: 16, color: "#1F2937" },
    filterIconButton: {
        width: 50,
        height: 50,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    communitiesSection: { marginBottom: 24 },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#B4B4BD",
        letterSpacing: 1,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    categoriesScroll: { paddingHorizontal: 20, gap: 16 },
    categoryCircle: { alignItems: "center", gap: 10 },
    categoryCircleIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: "center",
        alignItems: "center",
    },
    categoryCircleLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#6B7280",
        letterSpacing: 0.5,
    },
    forYouHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    forYouLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#B4B4BD",
        letterSpacing: 1,
    },
    sortDropdown: { flexDirection: "row", alignItems: "center", gap: 6 },
    sortDropdownText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#9B8BC9",
        letterSpacing: 0.5,
    },
    postsGridContainer: { paddingHorizontal: 20, paddingBottom: 20 },
    categoryHeader: {
        paddingTop: 16,
        paddingBottom: 32,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    backButton: {
        position: "absolute",
        top: 16,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    categoryHeaderIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    categoryHeaderTitle: {
        fontSize: 32,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 12,
    },
    categoryHeaderQuote: {
        fontSize: 15,
        fontStyle: "italic",
        color: "rgba(255,255,255,0.9)",
        textAlign: "center",
        lineHeight: 22,
        paddingHorizontal: 24,
    },
    categoryFilters: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FAFAFA",
    },
    filterChipsRow: { flexDirection: "row", gap: 10 },
    filterChipCategory: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    filterChipCategoryActive: {
        backgroundColor: "#F3F4F6",
        borderColor: "#9B8BC9",
    },
    filterChipCategoryText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9CA3AF",
        letterSpacing: 0.5,
    },
    filterChipCategoryTextActive: { color: "#9B8BC9" },
    sortButton: { flexDirection: "row", alignItems: "center", gap: 6 },
    sortButtonText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#6B7280",
        letterSpacing: 0.5,
    },
    postsListContainer: { paddingHorizontal: 20, paddingBottom: 24 },
    postItemList: { marginBottom: 16 },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#6B7280",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 15,
        color: "#9CA3AF",
        textAlign: "center",
        lineHeight: 22,
    },
});
