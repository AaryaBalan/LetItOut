import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../components/Avatar";
import PostCard from "../components/PostCard";
import TabScreenWrapper from "../components/TabScreenWrapper";
import { db } from "../config/firebase";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

const getCategoryTheme = (category, isDark) => {
    const themes = {
        "Family": { icon: "people", color: isDark ? "#8AB4F8" : "#2F80ED", bgColor: isDark ? "#EBF3FE" : "#EBF3FE" },
        "Stress": { icon: "leaf", color: isDark ? "#F28B82" : "#EB5757", bgColor: isDark ? "#FCEEEE" : "#FCEEEE" },
        "Relationship": { icon: "heart", color: isDark ? "#F8BBD0" : "#F2C94C", bgColor: isDark ? "#FEF9E6" : "#FEF9E6" },
        "Study": { icon: "book", color: isDark ? "#81C995" : "#27AE60", bgColor: isDark ? "#E9F7EF" : "#E9F7EF" },
        "Mental Health": { icon: "fitness", color: isDark ? "#FDD663" : "#6366F1", bgColor: isDark ? "#EEF2FF" : "#EEF2FF" },
        "Other": { icon: "ellipsis-horizontal", color: isDark ? "#E8EAED" : "#3C4043", bgColor: isDark ? "#3C4043" : "#F1F3F4" }
    };
    return themes[category] || themes["Other"];
};

const COMMUNITY_INFO = {
    "Family": { desc: "Parenting, siblings, home issues & family stability.", members: "18.2k", active: "192" },
    "Stress": { desc: "Handling workplace pressure, anxiety & finding inner peace.", members: "24.5k", active: "532" },
    "Relationship": { desc: "Dating, love, breakups, marriage, and friendship talk.", members: "45.1k", active: "820" },
    "Study": { desc: "School pressure, career choices, exams, and growth.", members: "12.8k", active: "140" },
    "Mental Health": { desc: "Daily wellbeing, coping strategies, depression & self-care.", members: "54.0k", active: "1.2k" },
    "Other": { desc: "Share anything else on your mind in a safe space.", members: "8.3k", active: "72" }
};

export default function Explore() {
    const router = useRouter();
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState("");
    const [posts, setPosts] = useState([]);
    const [authorProfiles, setAuthorProfiles] = useState({});

    // Fetch posts
    useEffect(() => {
        const postsRef = collection(db, "posts");
        const q = query(postsRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                reactionCount: doc.data().reactionCount || 0,
                commentCount: doc.data().commentCount || 0,
            }));
            setPosts(fetchedPosts);
        });
        return () => unsubscribe();
    }, []);

    // Fetch author profile codes for top 10 posts
    useEffect(() => {
        const fetchAuthorProfiles = async () => {
            const top10 = [...posts]
                .sort((a, b) => (b.reactionCount + b.commentCount) - (a.reactionCount + a.commentCount))
                .slice(0, 10);

            for (const post of top10) {
                if (post.authorId && !post.isAnonymous) {
                    try {
                        const userRef = doc(db, "users", post.authorId);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            setAuthorProfiles(prev => ({
                                ...prev,
                                [post.authorId]: userData.profileCode || userData.email || null
                            }));
                        }
                    } catch (error) {
                        console.error("Error fetching profile:", error);
                    }
                }
            }
        };

        if (posts.length > 0) {
            fetchAuthorProfiles();
        }
    }, [posts]);

    // Top 10 Logic
    const top10Posts = [...posts]
        .sort((a, b) => (b.reactionCount + b.commentCount) - (a.reactionCount + a.commentCount))
        .slice(0, 10);

    // Help Needed Posts Logic - 5 most recent posts with helpNeeded: true
    const helpNeededPosts = [...posts]
        .filter(p => p.helpNeeded === true)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    // Filter Logic
    const filteredPosts = searchQuery.trim()
        ? posts.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const handleCategoryPress = (id) => {
        router.push(`/community/${id}`);
    };

    return (
        <TabScreenWrapper>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={["top"]}>
                <StatusBar barStyle={theme.statusBar} backgroundColor={theme.surface} />

                <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: theme.surface }} contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.surface }]}>
                    {/* Modern White Header */}
                    <View style={[styles.headerWrapper, { backgroundColor: theme.surface }]}>
                        <View style={styles.header}>
                            {/* Top Row */}
                            <View style={styles.headerTop}>
                                <View style={styles.headerLeft}>
                                    <TouchableOpacity
                                        style={[styles.iconButton, { backgroundColor: theme.isDark ? '#2A2A2A' : '#F3F4F6' }]}
                                        onPress={() => router.back()}
                                    >
                                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                                    </TouchableOpacity>
                                    <View>
                                        <Text style={[styles.headerTitle, { color: theme.text }]}>Explore</Text>
                                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Discover & Connect</Text>
                                    </View>
                                </View>
                                <View style={styles.headerRight} />
                            </View>

                            {/* Enhanced Search Bar */}
                            <View style={styles.searchContainer}>
                                <View style={[styles.searchBar, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                                    <Ionicons name="search" size={20} color="#111827" />
                                    <TextInput
                                        style={[styles.searchInput, { color: theme.text }]}
                                        placeholder="Search communities, topics, people..."
                                        placeholderTextColor={theme.placeholder}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                    {searchQuery.length > 0 && (
                                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                                            <Ionicons name="close-circle" size={20} color="#BDBDBD" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>

                    {searchQuery.trim() ? (
                        // Search Results
                        <View style={[styles.resultsSection, { backgroundColor: theme.surface }]}>
                            {filteredPosts.map(post => <PostCard key={post.id} post={post} />)}
                        </View>
                    ) : (
                        <>
                            {/* Discovery - Communities */}
                            <View style={[styles.sectionHeader, { backgroundColor: theme.surface, marginTop: 8 }]}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>EXPLORE COMMUNITIES</Text>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ backgroundColor: theme.surface }}
                                contentContainerStyle={[styles.communitiesCarousel, { backgroundColor: theme.surface }]}
                            >
                                {Object.keys(COMMUNITY_INFO).map((cat) => {
                                    const info = COMMUNITY_INFO[cat];
                                    const catTheme = getCategoryTheme(cat, theme.isDark);
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[styles.communityCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                                            onPress={() => handleCategoryPress(cat)}
                                        >
                                            {/* Banner */}
                                            <View style={[styles.communityBanner, { backgroundColor: catTheme.bgColor }]}>
                                                <Ionicons name={catTheme.icon} size={48} color={catTheme.color} style={styles.bannerIconWatermark} />
                                            </View>
                                            {/* Overlapping Icon */}
                                            <View style={[styles.communityIconContainer, { backgroundColor: theme.card }]}>
                                                <View style={[styles.communityIconInner, { backgroundColor: catTheme.bgColor }]}>
                                                    <Ionicons name={catTheme.icon} size={20} color={catTheme.color} />
                                                </View>
                                            </View>
                                            {/* Info */}
                                            <View style={styles.communityCardContent}>
                                                <Text style={[styles.communityName, { color: theme.text }]}>c/{cat}</Text>
                                                <Text style={[styles.communityDesc, { color: theme.textSecondary, marginTop: 4 }]} numberOfLines={3}>
                                                    {info.desc}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Top 10 Stories */}
                            <View style={[styles.sectionHeader, { marginTop: 32, backgroundColor: theme.surface }]}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>TOP 10 TODAY</Text>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                pagingEnabled
                                decelerationRate="fast"
                                snapToInterval={width * 0.85 + 16}
                                style={{ backgroundColor: theme.surface }}
                                contentContainerStyle={[styles.top10List, { backgroundColor: theme.surface }]}
                            >
                                {top10Posts.map((post, index) => (
                                    <TouchableOpacity
                                        key={post.id}
                                        style={[styles.top10Card, { backgroundColor: theme.card, borderColor: theme.border }]}
                                        onPress={() => router.push(`/post/${post.id}`)}
                                    >
                                        {/* Rank Badge - Top Right */}
                                        <View style={styles.rankBadge}>
                                            <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                                        </View>

                                        {/* Author Profile Picture */}
                                        {post.isAnonymous || !post.authorId || !authorProfiles[post.authorId] ? (
                                            <View style={[styles.top10ProfilePic, { backgroundColor: 'transparent' }]}>
                                                <Image
                                                    source={require("../assets/images/letitout_logo.png")}
                                                    style={{ width: 48, height: 48, borderRadius: 24 }}
                                                />
                                            </View>
                                        ) : (
                                            <View style={styles.top10ProfilePic}>
                                                <Avatar seed={authorProfiles[post.authorId]} size={48} />
                                            </View>
                                        )}

                                        {/* Title */}
                                        <Text style={[styles.top10Title, { color: theme.text }]} numberOfLines={2}>
                                            {post.title}
                                        </Text>

                                        {/* Description */}
                                        <Text style={[styles.top10Description, { color: theme.textSecondary }]} numberOfLines={3}>
                                            {post.description}
                                        </Text>

                                        {/* Author */}
                                        {post.authorName && (
                                            <Text style={[styles.top10QuoteAuthor, { color: theme.textSecondary }]}>
                                                - {post.authorName}
                                            </Text>
                                        )}

                                        {/* Divider */}
                                        <View style={[styles.top10Divider, { backgroundColor: theme.isDark ? '#3A3A5A' : '#E0E7FF' }]} />

                                        {/* Category Tag */}
                                        <Text style={[styles.top10Tag, { color: theme.textSecondary }]}>
                                            ON {post.category.toUpperCase()}
                                        </Text>

                                        {/* Reactions */}
                                        <View style={styles.top10Reactions}>
                                            <View style={styles.top10ReactionItem}>
                                                <Ionicons name="heart" size={14} color="#E57373" />
                                                <Text style={[styles.top10ReactionText, { color: theme.textSecondary }]}>
                                                    {Math.floor((post.reactionCount || 0) * 0.4)}
                                                </Text>
                                            </View>
                                            <View style={styles.top10ReactionItem}>
                                                <Ionicons name="hand-left" size={14} color="#FFB74D" />
                                                <Text style={[styles.top10ReactionText, { color: theme.textSecondary }]}>
                                                    {Math.floor((post.reactionCount || 0) * 0.3)}
                                                </Text>
                                            </View>
                                            <View style={styles.top10ReactionItem}>
                                                <Ionicons name="happy" size={14} color="#66BB6A" />
                                                <Text style={[styles.top10ReactionText, { color: theme.textSecondary }]}>
                                                    {Math.floor((post.reactionCount || 0) * 0.3)}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Posts That Need Your Help */}
                            <View style={[styles.sectionHeader, { marginTop: 32, backgroundColor: theme.surface }]}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>POSTS THAT NEED YOUR HELP</Text>
                            </View>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                pagingEnabled
                                decelerationRate="fast"
                                snapToInterval={width * 0.85 + 16}
                                style={{ backgroundColor: theme.surface }}
                                contentContainerStyle={[styles.top10List, { backgroundColor: theme.surface }]}
                            >
                                {helpNeededPosts.map((post, index) => (
                                    <TouchableOpacity
                                        key={post.id}
                                        style={[styles.top10Card, { backgroundColor: theme.card, borderColor: theme.border }]}
                                        onPress={() => router.push(`/post/${post.id}`)}
                                    >
                                        {/* Help Badge - Top Right */}
                                        <View style={[styles.rankBadge, { backgroundColor: '#E57373' }]}>
                                            <Ionicons name="help-circle" size={14} color="#FFFFFF" />
                                        </View>

                                        {/* Author Profile Picture */}
                                        {post.isAnonymous || !post.authorId || !authorProfiles[post.authorId] ? (
                                            <View style={[styles.top10ProfilePic, { backgroundColor: 'transparent' }]}>
                                                <Image
                                                    source={require("../assets/images/letitout_logo.png")}
                                                    style={{ width: 48, height: 48, borderRadius: 24 }}
                                                />
                                            </View>
                                        ) : (
                                            <View style={styles.top10ProfilePic}>
                                                <Avatar seed={authorProfiles[post.authorId]} size={48} />
                                            </View>
                                        )}

                                        {/* Title */}
                                        <Text style={[styles.top10Title, { color: theme.text }]} numberOfLines={2}>
                                            {post.title}
                                        </Text>

                                        {/* Description */}
                                        <Text style={[styles.top10Description, { color: theme.textSecondary }]} numberOfLines={3}>
                                            {post.description}
                                        </Text>

                                        {/* Author */}
                                        {post.authorName && (
                                            <Text style={[styles.top10QuoteAuthor, { color: theme.textSecondary }]}>
                                                - {post.authorName}
                                            </Text>
                                        )}

                                        {/* Divider */}
                                        <View style={[styles.top10Divider, { backgroundColor: theme.isDark ? '#3A3A5A' : '#E0E7FF' }]} />

                                        {/* Category Tag */}
                                        <Text style={[styles.top10Tag, { color: theme.textSecondary }]}>
                                            ON {post.category.toUpperCase()}
                                        </Text>

                                        {/* Reactions */}
                                        <View style={styles.top10Reactions}>
                                            <View style={styles.top10ReactionItem}>
                                                <Ionicons name="heart" size={14} color="#E57373" />
                                                <Text style={[styles.top10ReactionText, { color: theme.textSecondary }]}>
                                                    {Math.floor((post.reactionCount || 0) * 0.4)}
                                                </Text>
                                            </View>
                                            <View style={styles.top10ReactionItem}>
                                                <Ionicons name="hand-left" size={14} color="#FFB74D" />
                                                <Text style={[styles.top10ReactionText, { color: theme.textSecondary }]}>
                                                    {Math.floor((post.reactionCount || 0) * 0.3)}
                                                </Text>
                                            </View>
                                            <View style={styles.top10ReactionItem}>
                                                <Ionicons name="happy" size={14} color="#66BB6A" />
                                                <Text style={[styles.top10ReactionText, { color: theme.textSecondary }]}>
                                                    {Math.floor((post.reactionCount || 0) * 0.3)}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}

                                {/* View More Card */}
                                <TouchableOpacity
                                    style={[styles.top10Card, styles.viewMoreCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                                    onPress={() => router.push('/help-needed')}
                                >
                                    <Ionicons name="arrow-forward-circle" size={48} color="#111827" />
                                    <Text style={[styles.viewMoreText, { color: theme.text }]}>View More</Text>
                                    <Text style={[styles.viewMoreSubtext, { color: theme.textSecondary }]}>
                                        See all posts that need help
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>

                            {/* Editorial Pick */}
                            <View style={[styles.editorialSection, { backgroundColor: theme.surface }]}>
                                <Text style={[styles.curatedTitle, { color: theme.textSecondary }]}>CURATED FOR YOU</Text>
                                <Text style={[styles.editorialLabel, { color: theme.textTertiary }]}>EDITORIAL PICK</Text>

                                <Text style={[styles.articleTitle, { color: theme.text }]}>
                                    How to find quiet in a world that never stops talking.
                                </Text>

                                <Text style={[styles.articleSnippet, { color: theme.textSecondary }]}>
                                    In an age of constant connectivity, the most radical act is disconnection. Here is how we reclaim our inner silence.
                                </Text>

                                <TouchableOpacity style={styles.readMoreButton}>
                                    <View style={styles.readMoreLine} />
                                    <Text style={styles.readMoreText}>READ ARTICLE</Text>
                                    <View style={styles.readMoreLine} />
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    scrollContent: {
        paddingBottom: 80,
    },
    headerWrapper: {
        backgroundColor: "#FFFFFF",
        paddingTop: 8,
        marginBottom: 12,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    resultsSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3E5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#9E9E9E',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        // backgroundColor removed - now set inline with theme
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        paddingHorizontal: 0,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F9FA",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: "#111827",
        fontWeight: "500",
    },

    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: "800",
        color: "#9CA3AF",
        letterSpacing: 1.5,
    },
    swipeHint: {
        fontSize: 11,
        fontStyle: "italic",
        color: "#D1D5DB",
    },

    // Bento Grid
    bentoGrid: {
        paddingHorizontal: 24,
        gap: 16,
    },
    bentoRow: {
        flexDirection: "row",
        gap: 16,
    },
    bentoCard: {
        borderRadius: 24,
        padding: 20,
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.6)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    cardContentHorizontal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    cardFeed: {
        height: 100,
        backgroundColor: "#E8EAF6", // Indigo 50
        justifyContent: "center",
    },
    cardHealing: {
        flex: 1,
        height: 170,
        backgroundColor: "#FFE082", // Mental Health
    },
    cardAnxiety: {
        flex: 1,
        height: 170,
        backgroundColor: "#B39DDB", // Stress
    },
    cardRelationships: {
        height: 120,
        backgroundColor: "#FFE8EE", // Relationships
        justifyContent: "center",
        paddingHorizontal: 32,
    },
    cardFamily: {
        flex: 1,
        height: 170,
        backgroundColor: "#FFCDD2", // Family
    },
    cardStudy: {
        flex: 1,
        height: 170,
        backgroundColor: "#B2DFDB", // Study
    },
    cardOther: {
        flex: 1,
        height: 170,
        backgroundColor: "#ECEFF1", // Other
    },
    cardAll: {
        flex: 1,
        height: 170,
        backgroundColor: "#263238", // All Topics
    },
    bentoTitleSerif: {
        fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        color: "#4A4A4A",
        marginBottom: 4,
    },
    bentoTitleBig: {
        fontSize: 26,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        color: "#263238",
        marginBottom: 4,
    },
    bentoSubtitle: {
        fontSize: 10,
        fontWeight: "700",
        color: "#787878",
        letterSpacing: 0.5,
        opacity: 0.6,
    },
    bentoSubtitleDark: {
        fontSize: 10,
        fontWeight: "700",
        color: "#546E7A",
        letterSpacing: 1,
        opacity: 0.7,
    },

    // Top 10 Section
    top10List: {
        paddingHorizontal: 24,
        paddingRight: 8,
    },
    top10Card: {
        width: width * 0.85,
        marginRight: 16,
        padding: 32,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
    },
    rankBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#111827',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        zIndex: 10,
    },
    rankBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    top10Title: {
        fontSize: 16,
        fontWeight: "700",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 12,
    },
    top10Description: {
        fontSize: 13,
        fontWeight: "400",
        textAlign: "center",
        lineHeight: 19,
        marginBottom: 16,
    },
    top10QuoteAuthor: {
        fontSize: 13,
        marginTop: -8,
        marginBottom: 20,
        fontStyle: "italic",
    },
    top10Divider: {
        width: 40,
        height: 2,
        marginBottom: 12,
    },
    top10Tag: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    top10Reactions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },
    top10ReactionItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    top10ReactionText: {
        fontSize: 12,
        fontWeight: "600",
    },
    viewMoreCard: {
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    viewMoreText: {
        fontSize: 18,
        fontWeight: "700",
    },
    viewMoreSubtext: {
        fontSize: 13,
        textAlign: "center",
        paddingHorizontal: 20,
    },

    // Stories of the Day
    storiesList: {
        paddingHorizontal: 24,
    },
    storyCard: {
        width: width * 0.85,
        marginRight: 16,
        padding: 32,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
    },
    quoteIcon: {
        marginBottom: 24,
    },
    top10ProfilePic: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        overflow: 'hidden',
    },
    storyQuote: {
        fontSize: 20,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontStyle: "italic",
        color: "#111827",
        textAlign: "center",
        lineHeight: 30,
        marginBottom: 24,
    },
    storyAuthor: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: -16,
        marginBottom: 24,
        fontStyle: "italic",
    },
    divider: {
        width: 40,
        height: 2,
        backgroundColor: "#E0E7FF",
        marginBottom: 16,
    },
    storyTag: {
        fontSize: 10,
        fontWeight: "700",
        color: "#9CA3AF",
        letterSpacing: 1.5,
    },

    // Editorial Pick
    editorialSection: {
        padding: 32,
        alignItems: "center",
        marginTop: 24,
    },
    curatedTitle: {
        fontSize: 10,
        fontWeight: "800",
        color: "#9CA3AF",
        letterSpacing: 2,
        marginBottom: 16,
    },
    editorialLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#A5B4FC",
        letterSpacing: 1,
        marginBottom: 16,
    },
    articleTitle: {
        fontSize: 28,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        color: "#1F2937",
        textAlign: "center",
        lineHeight: 36,
        marginBottom: 16,
    },
    articleSnippet: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    readMoreButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    readMoreLine: {
        width: 40,
        height: 1,
        backgroundColor: "#E5E7EB",
    },
    readMoreText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#374151",
        letterSpacing: 1.5,
    },
    pulseBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        gap: 10,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
    },
    pulseText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    communitiesCarousel: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    communityCard: {
        width: 220,
        borderRadius: 20,
        marginRight: 16,
        overflow: 'hidden',
        position: 'relative',
        paddingBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
    },
    communityBanner: {
        height: 70,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 16,
    },
    bannerIconWatermark: {
        opacity: 0.15,
        position: 'absolute',
        bottom: -10,
        right: -10,
    },
    communityIconContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        padding: 3,
        position: 'absolute',
        top: 47,
        left: 16,
        zIndex: 10,
    },
    communityIconInner: {
        flex: 1,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    communityCardContent: {
        paddingTop: 30,
        paddingHorizontal: 16,
    },
    communityName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    communityStats: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 8,
    },
    communityDesc: {
        fontSize: 12,
        lineHeight: 16,
        height: 48,
        marginBottom: 4,
    },
    communityJoinBtn: {
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    communityJoinText: {
        fontSize: 12,
        fontWeight: '700',
    },
});
