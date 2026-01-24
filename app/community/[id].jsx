import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import PostCard from "../../components/PostCard";
import { db } from "../../config/firebase";

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

export default function CommunityDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState("latest");
    const [selectedSort, setSelectedSort] = useState("recent");
    const [selectedMood, setSelectedMood] = useState(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const categoryData = CATEGORIES.find((cat) => cat.id === id);

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
                    feelPercentage: data.feelPercentage ?? 50,
                };
            });
            setPosts(fetched);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let filtered = posts.filter((p) => p.category === id);

        // Filter by mood if selected
        if (selectedMood === "depression") {
            filtered = filtered.filter((p) => {
                const feel = p.feelPercentage ?? 50;
                return feel < 50;
            });
        } else if (selectedMood === "happiness") {
            filtered = filtered.filter((p) => (p.feelPercentage ?? 50) >= 50);
        }

        // Handle different sort options
        if (selectedFilter === "help" || selectedSort === "help") {
            filtered.sort((a, b) => {
                if (a.helpNeeded && !b.helpNeeded) return -1;
                if (!a.helpNeeded && b.helpNeeded) return 1;
                return (b.reactionCount || 0) - (a.reactionCount || 0);
            });
        } else if (selectedSort === "popular") {
            filtered.sort(
                (a, b) => (b.reactionCount || 0) - (a.reactionCount || 0),
            );
        } else if (selectedSort === "mostCommented") {
            filtered.sort(
                (a, b) => (b.reactionCount || 0) - (a.reactionCount || 0),
            );
        }
        // Default: recent (by createdAt desc - already from Firebase)

        setFilteredPosts(filtered);
    }, [posts, id, selectedFilter, selectedSort, selectedMood]);

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

    const renderPost = ({ item }) => (
        <View style={styles.postItemList}>
            <PostCard post={item} />
        </View>
    );

    if (!categoryData) {
        return (
            <SafeAreaView style={styles.container}>
                <Text>Category not found</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={categoryData.gradientColors[0]}
                translucent={false}
            />
            <View
                style={[
                    styles.categoryHeader,
                    { backgroundColor: categoryData.gradientColors[0] },
                ]}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.categoryHeaderIcon}>
                    <Ionicons name={categoryData.icon} size={32} color="#FFF" />
                </View>
                <Text style={styles.categoryHeaderTitle}>{categoryData.id}</Text>
                <Text style={styles.categoryHeaderQuote}>
                    "{categoryData.quote}"
                </Text>
            </View>

            <View style={styles.categoryFilters}>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowFilterModal(true)}
                >
                    <Ionicons name="options-outline" size={22} color="#6B7280" />
                    <Text style={styles.filterButtonText}>Filters</Text>
                </TouchableOpacity>

                {(selectedFilter !== "latest" || selectedSort !== "recent" || selectedMood !== null) && (
                    <TouchableOpacity
                        style={styles.clearFilterButton}
                        onPress={() => {
                            setSelectedFilter("latest");
                            setSelectedSort("recent");
                            setSelectedMood(null);
                        }}
                    >
                        <Ionicons name="close-circle" size={20} color="#9B8BC9" />
                        <Text style={styles.clearFilterText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={filteredPosts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.postsListContainer}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.emptyState}>
                            <ActivityIndicator size="large" color="#B39DDB" />
                            <Text style={styles.emptyStateTitle}>Loading posts...</Text>
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons
                                name="search-outline"
                                size={64}
                                color="#BDBDBD"
                            />
                            <Text style={styles.emptyStateTitle}>No posts found</Text>
                            <Text style={styles.emptyStateText}>
                                Be the first to share in this category
                            </Text>
                        </View>
                    )
                }
            />

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sort & Filter</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Ionicons name="close" size={28} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {/* Sort & Filter Section */}
                        <View style={styles.modalSection}>
                            <Text style={styles.modalSectionTitle}>Sort & Filter</Text>
                            <View style={styles.modalOptionsColumn}>
                                <TouchableOpacity
                                    style={[
                                        styles.modalOption,
                                        selectedFilter === "latest" && selectedSort === "recent" && styles.modalOptionActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedFilter("latest");
                                        setSelectedSort("recent");
                                    }}
                                >
                                    <Ionicons
                                        name="time-outline"
                                        size={20}
                                        color={selectedFilter === "latest" && selectedSort === "recent" ? "#9B8BC9" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            styles.modalOptionText,
                                            selectedFilter === "latest" && selectedSort === "recent" && styles.modalOptionTextActive,
                                        ]}
                                    >
                                        Latest
                                    </Text>
                                    {selectedFilter === "latest" && selectedSort === "recent" && (
                                        <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.modalOption,
                                        selectedFilter === "help" && styles.modalOptionActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedFilter("help");
                                        setSelectedSort("help");
                                    }}
                                >
                                    <Ionicons
                                        name="hand-left-outline"
                                        size={20}
                                        color={selectedFilter === "help" ? "#9B8BC9" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            styles.modalOptionText,
                                            selectedFilter === "help" && styles.modalOptionTextActive,
                                        ]}
                                    >
                                        Help Needed
                                    </Text>
                                    {selectedFilter === "help" && (
                                        <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.modalOption,
                                        selectedSort === "popular" && styles.modalOptionActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedFilter("latest");
                                        setSelectedSort("popular");
                                    }}
                                >
                                    <Ionicons
                                        name="trending-up-outline"
                                        size={20}
                                        color={selectedSort === "popular" ? "#9B8BC9" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            styles.modalOptionText,
                                            selectedSort === "popular" && styles.modalOptionTextActive,
                                        ]}
                                    >
                                        Popular
                                    </Text>
                                    {selectedSort === "popular" && (
                                        <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.modalOption,
                                        selectedSort === "mostCommented" && styles.modalOptionActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedFilter("latest");
                                        setSelectedSort("mostCommented");
                                    }}
                                >
                                    <Ionicons
                                        name="chatbubbles-outline"
                                        size={20}
                                        color={selectedSort === "mostCommented" ? "#9B8BC9" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            styles.modalOptionText,
                                            selectedSort === "mostCommented" && styles.modalOptionTextActive,
                                        ]}
                                    >
                                        Most Commented
                                    </Text>
                                    {selectedSort === "mostCommented" && (
                                        <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Mood Section */}
                        <View style={styles.modalSection}>
                            <Text style={styles.modalSectionTitle}>Filter by Mood</Text>
                            <View style={styles.modalOptionsColumn}>
                                <TouchableOpacity
                                    style={[
                                        styles.modalOption,
                                        selectedMood === "depression" && styles.modalOptionActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedMood(selectedMood === "depression" ? null : "depression");
                                    }}
                                >
                                    <Ionicons
                                        name="sad-outline"
                                        size={20}
                                        color={selectedMood === "depression" ? "#9B8BC9" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            styles.modalOptionText,
                                            selectedMood === "depression" && styles.modalOptionTextActive,
                                        ]}
                                    >
                                        Depression
                                    </Text>
                                    {selectedMood === "depression" && (
                                        <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.modalOption,
                                        selectedMood === "happiness" && styles.modalOptionActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedMood(selectedMood === "happiness" ? null : "happiness");
                                    }}
                                >
                                    <Ionicons
                                        name="happy-outline"
                                        size={20}
                                        color={selectedMood === "happiness" ? "#9B8BC9" : "#6B7280"}
                                    />
                                    <Text
                                        style={[
                                            styles.modalOptionText,
                                            selectedMood === "happiness" && styles.modalOptionTextActive,
                                        ]}
                                    >
                                        Happiness
                                    </Text>
                                    {selectedMood === "happiness" && (
                                        <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Apply Button */}
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={() => setShowFilterModal(false)}
                        >
                            <Text style={styles.applyButtonText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAFAFA" },
    categoryHeader: {
        paddingHorizontal: 20,
        paddingTop: 48,
        paddingBottom: 24,
        alignItems: "center",
    },
    backButton: {
        position: "absolute",
        left: 16,
        top: 48,
        zIndex: 10,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    categoryHeaderIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "rgba(255,255,255,0.25)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    categoryHeaderTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#FFF",
        marginBottom: 8,
    },
    categoryHeaderQuote: {
        fontSize: 14,
        color: "rgba(255,255,255,0.9)",
        textAlign: "center",
        paddingHorizontal: 32,
        fontStyle: "italic",
    },
    categoryFilters: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
        gap: 10,
    },
    filterButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        gap: 8,
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    clearFilterButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#E8E4F3",
        gap: 6,
    },
    clearFilterText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#9B8BC9",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
    },
    modalSection: {
        marginBottom: 28,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 12,
    },
    modalChipsRow: {
        flexDirection: "row",
        gap: 10,
        flexWrap: "wrap",
    },
    modalChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    modalChipActive: {
        backgroundColor: "#E8E4F3",
        borderColor: "#9B8BC9",
    },
    modalChipText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#6B7280",
        letterSpacing: 0.5,
    },
    modalChipTextActive: {
        color: "#9B8BC9",
    },
    modalOptionsColumn: {
        gap: 8,
    },
    modalOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#F9FAFB",
        gap: 12,
    },
    modalOptionActive: {
        backgroundColor: "#E8E4F3",
    },
    modalOptionText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#374151",
    },
    modalOptionTextActive: {
        color: "#9B8BC9",
        fontWeight: "600",
    },
    applyButton: {
        backgroundColor: "#9B8BC9",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 12,
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    postsListContainer: { paddingTop: 0, paddingBottom: 100 },
    postItemList: { marginBottom: 0 },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#6B7280",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
    },
});
