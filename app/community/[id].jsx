import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    FlatList,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Loading from "../../components/Loading";
import PostCard from "../../components/PostCard";
import { db } from "../../config/firebase";
import { useTheme } from "../../context/ThemeContext";

const CATEGORIES = [
    {
        id: "All",
        name: "ALL TOPICS",
        icon: "grid",
        iconColor: "#78909C",
        bgColor: "#ECEFF1",
        gradientColors: ["#B0BEC5", "#78909C"],
        quote: "We are all in this together. You are never alone.",
    },
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
        gradientColors: ["#B39DDB", "#7C3AED"],
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

const getCategoryTheme = (category, isDark) => {
  const themes = {
    "All": { icon: "grid", color: isDark ? "#E8EAED" : "#3C4043", bgColor: isDark ? "#3C4043" : "#F1F3F4" },
    "Family": { icon: "people", color: isDark ? "#8AB4F8" : "#1A73E8", bgColor: isDark ? "#174EA6" : "#E8F0FE" },
    "Stress": { icon: "leaf", color: isDark ? "#F28B82" : "#D93025", bgColor: isDark ? "#C5221F" : "#FCE8E6" },
    "Relationship": { icon: "heart", color: isDark ? "#F8BBD0" : "#C2185B", bgColor: isDark ? "#880E4F" : "#FCE4EC" },
    "Study": { icon: "book", color: isDark ? "#81C995" : "#188038", bgColor: isDark ? "#137333" : "#E6F4EA" },
    "Mental Health": { icon: "fitness", color: isDark ? "#FDD663" : "#B06000", bgColor: isDark ? "#E37400" : "#FEF7E0" },
    "Other": { icon: "ellipsis-horizontal", color: isDark ? "#E8EAED" : "#3C4043", bgColor: isDark ? "#3C4043" : "#F1F3F4" }
  };
  return themes[category] || themes["Other"];
};

export default function CommunityDetail() {
    const { id } = useLocalSearchParams();
    const { theme } = useTheme();
    const router = useRouter();
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState("latest");
    const [selectedSort, setSelectedSort] = useState("recent");
    const [selectedMood, setSelectedMood] = useState(null);
    const [showAnonymousOnly, setShowAnonymousOnly] = useState(false);
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
                    feelPercentage: data.feelPercentage ?? 0,
                };
            });
            setPosts(fetched);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Filter by category (show all if id is 'All')
        let filtered = id === "All"
            ? posts
            : posts.filter((p) => p.category === id);

        // ENFORCE ANONYMOUS ONLY if toggle is on
        if (showAnonymousOnly) {
            filtered = filtered.filter(p => p.isAnonymous);
        }

        // Filter by mood if selected
        if (selectedMood === "depression") {
            filtered = filtered.filter((p) => {
                const feel = p.feelPercentage ?? 0;
                return feel < 0;
            });
        } else if (selectedMood === "happiness") {
            filtered = filtered.filter((p) => (p.feelPercentage ?? 0) >= 0);
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
    }, [posts, id, selectedFilter, selectedSort, selectedMood, showAnonymousOnly]);

    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "Just now";

        if (typeof timestamp === 'string') {
            if (timestamp === 'Just now') return timestamp;
            const match = timestamp.match(/^(\d+)d ago$/);
            if (match) {
                const days = parseInt(match[1], 10);
                if (days >= 7) {
                    const weeks = Math.floor(days / 7);
                    const months = Math.floor(days / 30);
                    const years = Math.floor(days / 365);
                    if (days < 30) return `${weeks}w ago`;
                    if (days < 365) return `${months}mon ago`;
                    return `${years}yr ago`;
                }
            }
            const parsedDate = new Date(timestamp);
            if (isNaN(parsedDate.getTime())) {
                return timestamp;
            }
            timestamp = parsedDate;
        }

        const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

        if (isNaN(postDate.getTime())) return "Just now";

        const now = new Date();
        const diffInMs = now - postDate;
        const diffInMinutes = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        const diffInWeeks = Math.floor(diffInDays / 7);
        const diffInMonths = Math.floor(diffInDays / 30);
        const diffInYears = Math.floor(diffInDays / 365);

        if (diffInMinutes < 1) return "Just now";
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        if (diffInDays < 30) return `${diffInWeeks}w ago`;
        if (diffInDays < 365) return `${diffInMonths}mon ago`;
        return `${diffInYears}yr ago`;
    };

    const catTheme = getCategoryTheme(id, theme.isDark);

    const listData = [
        { id: 'HEADER_KEY', type: 'header' },
        { id: 'FILTERS_KEY', type: 'filters' },
        ...(filteredPosts.length > 0 
            ? filteredPosts.map(p => ({ ...p, type: 'post' }))
            : [{ id: 'EMPTY_KEY', type: 'empty' }]
        )
    ];

    const renderListItem = ({ item }) => {
        if (item.type === 'header') {
            return (
                <View style={{ backgroundColor: theme.background }}>
                    {/* Full-width Banner */}
                    <View style={styles.heroContainer}>
                        <View style={[styles.heroBanner, { backgroundColor: catTheme.bgColor }]}>
                            <Ionicons name={categoryData.icon} size={110} color={catTheme.color} style={styles.heroWatermark} />
                        </View>
                        
                        {/* Absolute Overlay Nav Bar */}
                        <View style={styles.navHeader}>
                            <TouchableOpacity
                                style={[styles.roundBackBtn, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]}
                                onPress={() => router.back()}
                                delayPressIn={0}
                            >
                                <Ionicons name="chevron-back" size={24} color={theme.text} />
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[styles.roundBackBtn, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]}
                                onPress={() => setShowFilterModal(true)}
                                delayPressIn={0}
                            >
                                <Ionicons name="options-outline" size={20} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Community Title & Description details card (colliding/overlapping the banner) */}
                    <View style={[styles.communityDetailsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.titleRow}>
                            <View style={[styles.emblemBadge, { backgroundColor: catTheme.bgColor }]}>
                                <Ionicons name={categoryData.icon} size={20} color={catTheme.color} />
                            </View>
                            <Text style={[styles.communityTitleText, { color: theme.text }]}>c/{categoryData.id}</Text>
                        </View>
                        <Text style={[styles.communityDescriptionText, { color: theme.textSecondary }]}>
                            &ldquo;{categoryData.quote}&rdquo;
                        </Text>
                    </View>
                </View>
            );
        }

        if (item.type === 'filters') {
            return (
                <View style={[styles.filtersContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtersScrollContent}
                        keyboardShouldPersistTaps="always"
                    >
                        {[
                            { label: "Latest", type: "latest", sort: "recent", mood: null },
                            { label: "Popular", type: "latest", sort: "popular", mood: null },
                            { label: "Help Needed", type: "help", sort: "recent", mood: null },
                            { label: "Venting (-100 to 0)", type: "latest", sort: "recent", mood: "depression" },
                            { label: "Happy (0 to 100)", type: "latest", sort: "recent", mood: "happiness" },
                        ].map((opt, idx) => {
                            const isSelected = 
                                selectedFilter === opt.type &&
                                selectedSort === opt.sort &&
                                selectedMood === opt.mood;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.filterPill,
                                        { backgroundColor: theme.isDark ? '#2A2A2A' : '#F3F4F6' },
                                        isSelected && { backgroundColor: catTheme.bgColor, borderColor: catTheme.color }
                                    ]}
                                    delayPressIn={0}
                                    onPress={() => {
                                        setSelectedFilter(opt.type);
                                        setSelectedSort(opt.sort);
                                        setSelectedMood(opt.mood);
                                    }}
                                >
                                    <Text style={[styles.filterPillText, { color: theme.isDark ? '#FFF' : theme.textSecondary }, isSelected && { color: catTheme.color, fontWeight: '700' }]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        
                        {/* Anonymous Only Toggle Pill */}
                        <TouchableOpacity
                            style={[
                                styles.filterPill,
                                { backgroundColor: theme.isDark ? '#2A2A2A' : '#F3F4F6' },
                                showAnonymousOnly && { backgroundColor: catTheme.bgColor, borderColor: catTheme.color }
                            ]}
                            delayPressIn={0}
                            onPress={() => setShowAnonymousOnly(!showAnonymousOnly)}
                        >
                            <Ionicons name="eye-off-outline" size={14} color={showAnonymousOnly ? catTheme.color : (theme.isDark ? '#FFF' : theme.textSecondary)} style={{ marginRight: 4 }} />
                            <Text style={[styles.filterPillText, { color: theme.isDark ? '#FFF' : theme.textSecondary }, showAnonymousOnly && { color: catTheme.color, fontWeight: '700' }]}>
                                Anonymous Only
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            );
        }

        if (item.type === 'empty') {
            return loading ? (
                <View style={styles.emptyState}>
                    <Loading size="large" color={theme.isDark ? '#B39DDB' : '#7C3AED'} />
                    <Text style={[styles.emptyStateTitle, { color: theme.textSecondary }]}>Loading posts...</Text>
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Ionicons
                        name="search-outline"
                        size={64}
                        color={theme.textTertiary}
                    />
                    <Text style={[styles.emptyStateTitle, { color: theme.textSecondary }]}>No posts found</Text>
                    <Text style={[styles.emptyStateText, { color: theme.textTertiary }]}>
                        Be the first to share in this category
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.postItemList}>
                <PostCard post={item} />
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
            <StatusBar
                barStyle={theme.isDark ? "light-content" : "dark-content"}
                backgroundColor={catTheme.bgColor}
                translucent={false}
            />

            <FlatList
                data={listData}
                renderItem={renderListItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[1]}
                style={{ backgroundColor: theme.background }}
                contentContainerStyle={[styles.postsListContainer, { backgroundColor: theme.background }]}
            />

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
                        {/* Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="options-outline" size={22} color={theme.text} />
                                <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Options</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalCloseBtn} delayPressIn={0}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Section 1: Sort Feed */}
                        <View style={styles.modalSection}>
                            <Text style={[styles.modalSectionTitle, { color: theme.textSecondary }]}>SORT FEED BY</Text>
                            <View style={styles.modalChipsRow}>
                                {[
                                    { label: "Latest", value: { filter: "latest", sort: "recent" }, icon: "time-outline" },
                                    { label: "Popular", value: { filter: "latest", sort: "popular" }, icon: "trending-up-outline" },
                                    { label: "Most Commented", value: { filter: "latest", sort: "mostCommented" }, icon: "chatbubbles-outline" },
                                    { label: "Help Needed", value: { filter: "help", sort: "help" }, icon: "hand-left-outline" },
                                ].map((opt) => {
                                    const isSelected = selectedFilter === opt.value.filter && selectedSort === opt.value.sort;
                                    return (
                                        <TouchableOpacity
                                            key={opt.label}
                                            style={[
                                                styles.modalChip,
                                                { backgroundColor: theme.isDark ? '#2D2D2D' : '#F3F4F6', borderColor: theme.border },
                                                isSelected && { backgroundColor: catTheme.bgColor, borderColor: catTheme.color }
                                            ]}
                                            delayPressIn={0}
                                            onPress={() => {
                                                setSelectedFilter(opt.value.filter);
                                                setSelectedSort(opt.value.sort);
                                            }}
                                        >
                                            <Ionicons name={opt.icon} size={16} color={isSelected ? catTheme.color : theme.textSecondary} />
                                            <Text style={[styles.modalChipText, { color: theme.textSecondary }, isSelected && { color: catTheme.color, fontWeight: '700' }]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Section 2: Author Anonymity */}
                        <View style={styles.modalSection}>
                            <Text style={[styles.modalSectionTitle, { color: theme.textSecondary }]}>AUTHOR PRIVACY</Text>
                            <View style={styles.modalChipsRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.modalChip,
                                        { backgroundColor: theme.isDark ? '#2D2D2D' : '#F3F4F6', borderColor: theme.border },
                                        showAnonymousOnly && { backgroundColor: catTheme.bgColor, borderColor: catTheme.color }
                                    ]}
                                    delayPressIn={0}
                                    onPress={() => setShowAnonymousOnly(!showAnonymousOnly)}
                                >
                                    <Ionicons name="eye-off-outline" size={16} color={showAnonymousOnly ? catTheme.color : theme.textSecondary} />
                                    <Text style={[styles.modalChipText, { color: theme.textSecondary }, showAnonymousOnly && { color: catTheme.color, fontWeight: '700' }]}>
                                        Anonymous Stories Only
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Section 3: Filter by Mood */}
                        <View style={styles.modalSection}>
                            <Text style={[styles.modalSectionTitle, { color: theme.textSecondary }]}>FILTER BY MOOD</Text>
                            <View style={styles.modalChipsRow}>
                                {[
                                    { label: "All Moods", value: null, icon: "analytics-outline" },
                                    { label: "Venting (-100 to 0)", value: "depression", icon: "sad-outline" },
                                    { label: "Happiness (0 to 100)", value: "happiness", icon: "happy-outline" },
                                ].map((opt) => {
                                    const isSelected = selectedMood === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.label}
                                            style={[
                                                styles.modalChip,
                                                { backgroundColor: theme.isDark ? '#2D2D2D' : '#F3F4F6', borderColor: theme.border },
                                                isSelected && { backgroundColor: catTheme.bgColor, borderColor: catTheme.color }
                                            ]}
                                            delayPressIn={0}
                                            onPress={() => setSelectedMood(opt.value)}
                                        >
                                            <Ionicons name={opt.icon} size={16} color={isSelected ? catTheme.color : theme.textSecondary} />
                                            <Text style={[styles.modalChipText, { color: theme.textSecondary }, isSelected && { color: catTheme.color, fontWeight: '700' }]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={[styles.modalResetBtn, { borderColor: theme.border, borderWidth: 1 }]}
                                delayPressIn={0}
                                onPress={() => {
                                    setSelectedFilter("latest");
                                    setSelectedSort("recent");
                                    setSelectedMood(null);
                                    setShowAnonymousOnly(false);
                                }}
                            >
                                <Text style={[styles.modalResetText, { color: theme.text }]}>Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalApplyBtn, { backgroundColor: catTheme.color }]}
                                delayPressIn={0}
                                onPress={() => setShowFilterModal(false)}
                            >
                                <Text style={[styles.modalApplyText, { color: theme.isDark ? '#000' : '#FFF' }]}>Apply Settings</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroContainer: {
        position: 'relative',
        paddingBottom: 0,
    },
    heroBanner: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 32,
        overflow: 'hidden',
    },
    heroWatermark: {
        opacity: 0.12,
        transform: [{ rotate: '-15deg' }],
        position: 'absolute',
        right: -10,
        bottom: -20,
    },
    navHeader: {
        position: 'absolute',
        top: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 100,
    },
    roundBackBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    communityDetailsCard: {
        marginHorizontal: 16,
        marginTop: -30,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
    },
    emblemBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    communityTitleText: {
        fontSize: 22,
        fontWeight: '800',
    },
    communityDescriptionText: {
        fontSize: 13,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    filtersContainer: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        marginBottom: 8,
    },
    filtersScrollContent: {
        paddingHorizontal: 16,
        gap: 10,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterPillText: {
        fontSize: 13,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
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
        paddingBottom: 16,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalSection: {
        marginBottom: 24,
    },
    modalSectionTitle: {
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 1,
        marginBottom: 12,
    },
    modalChipsRow: {
        flexDirection: "row",
        gap: 10,
        flexWrap: "wrap",
    },
    modalChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    modalChipText: {
        fontSize: 13,
        fontWeight: "600",
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    modalResetBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalResetText: {
        fontSize: 15,
        fontWeight: '600',
    },
    modalApplyBtn: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7C3AED',
    },
    modalApplyText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    postsListContainer: { paddingTop: 12, paddingBottom: 100 },
    postItemList: { marginBottom: 12 },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        textAlign: "center",
    },
});
