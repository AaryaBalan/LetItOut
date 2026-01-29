import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Dimensions,
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
import PostCard from "../../components/PostCard";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

const { width } = Dimensions.get('window');

export default function Explore() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [posts, setPosts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("posts"); // "posts" or "people"

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
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch users
    useEffect(() => {
        const usersRef = collection(db, "users");
        const q = query(usersRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedUsers = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                loveSent: doc.data().loveSent || 0,
            }));
            setUsers(fetchedUsers);
        });
        return () => unsubscribe();
    }, []);

    // Top 10 Logic
    const top10Posts = [...posts]
        .sort((a, b) => (b.reactionCount + b.commentCount) - (a.reactionCount + a.commentCount))
        .slice(0, 10);

    // Filter Logic
    const filteredPosts = searchQuery.trim()
        ? posts.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const handleCategoryPress = (id) => {
        router.push(`/community/${id}`);
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Modern White Header */}
                <View style={styles.headerWrapper}>
                    <View style={styles.header}>
                        {/* Top Row */}
                        <View style={styles.headerTop}>
                            <View style={styles.headerLeft}>
                                <View style={styles.logoContainer}>
                                    <Ionicons name="compass" size={28} color="#9575cd" />
                                </View>
                                <View>
                                    <Text style={styles.headerTitle}>Explore</Text>
                                    <Text style={styles.headerSubtitle}>Discover & Connect</Text>
                                </View>
                            </View>
                            <View style={styles.headerRight}>
                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => router.push("/notifications")}
                                >
                                    <Ionicons name="notifications-outline" size={24} color="#212121" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Enhanced Search Bar */}
                        <View style={styles.searchContainer}>
                            <View style={styles.searchBar}>
                                <Ionicons name="search" size={20} color="#9575cd" />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search communities, topics, people..."
                                    placeholderTextColor="#BDBDBD"
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
                    <View style={styles.resultsSection}>
                        {filteredPosts.map(post => <PostCard key={post.id} post={post} />)}
                    </View>
                ) : (
                    <>
                        {/* Discovery - Bento Grid */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>DISCOVERY</Text>
                        </View>

                        <View style={styles.bentoGrid}>
                            {/* Feed Card - Wide */}
                            <TouchableOpacity
                                style={[styles.bentoCard, styles.cardFeed]}
                                onPress={() => router.push("/(tabs)/home")}
                            >
                                <View style={styles.cardContentHorizontal}>
                                    <View>
                                        <Text style={styles.bentoTitleBig}>Your Feed</Text>
                                        <Text style={styles.bentoSubtitleDark}>LATEST UPDATES</Text>
                                    </View>
                                    <View style={[styles.iconCircle, { backgroundColor: '#FFFFFF' }]}>
                                        <Ionicons name="newspaper" size={24} color="#5C6BC0" />
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* Row 1: Mental Health & Stress */}
                            <View style={styles.bentoRow}>
                                <TouchableOpacity
                                    style={[styles.bentoCard, styles.cardHealing]}
                                    onPress={() => handleCategoryPress("Mental Health")}
                                >
                                    <View style={styles.iconCircle}>
                                        <Ionicons name="fitness" size={24} color="#C8A656" />
                                    </View>
                                    <View>
                                        <Text style={styles.bentoTitleSerif}>Mental Health</Text>
                                        <Text style={styles.bentoSubtitle}>DAILY WELLBEING</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.bentoCard, styles.cardAnxiety]}
                                    onPress={() => handleCategoryPress("Stress")}
                                >
                                    <View style={styles.iconCircle}>
                                        <Ionicons name="leaf" size={24} color="#7C6BA8" />
                                    </View>
                                    <View>
                                        <Text style={styles.bentoTitleSerif}>Stress</Text>
                                        <Text style={styles.bentoSubtitle}>FINDING PEACE</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Row 2: Relationship (Wide) */}
                            <TouchableOpacity
                                style={[styles.bentoCard, styles.cardRelationships]}
                                onPress={() => handleCategoryPress("Relationship")}
                            >
                                <View style={styles.cardContentHorizontal}>
                                    <View>
                                        <Text style={styles.bentoTitleBig}>Relationship</Text>
                                        <Text style={styles.bentoSubtitleDark}>LOVE & CONNECTION</Text>
                                    </View>
                                    <Ionicons name="heart" size={48} color="rgba(244, 143, 177, 0.5)" />
                                </View>
                            </TouchableOpacity>

                            {/* Row 3: Family & Study */}
                            <View style={styles.bentoRow}>
                                <TouchableOpacity
                                    style={[styles.bentoCard, styles.cardFamily]}
                                    onPress={() => handleCategoryPress("Family")}
                                >
                                    <View style={styles.iconCircle}>
                                        <Ionicons name="home" size={24} color="#E57373" />
                                    </View>
                                    <View>
                                        <Text style={styles.bentoTitleSerif}>Family</Text>
                                        <Text style={styles.bentoSubtitle}>HOME SUPPORT</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.bentoCard, styles.cardStudy]}
                                    onPress={() => handleCategoryPress("Study")}
                                >
                                    <View style={styles.iconCircle}>
                                        <Ionicons name="school" size={24} color="#5FA49C" />
                                    </View>
                                    <View>
                                        <Text style={styles.bentoTitleSerif}>Study</Text>
                                        <Text style={styles.bentoSubtitle}>CAREER & GROWTH</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>

                            {/* Row 4: Other & All Topics */}
                            <View style={styles.bentoRow}>
                                <TouchableOpacity
                                    style={[styles.bentoCard, styles.cardOther]}
                                    onPress={() => handleCategoryPress("Other")}
                                >
                                    <View style={styles.iconCircle}>
                                        <Ionicons name="ellipsis-horizontal" size={24} color="#90A4AE" />
                                    </View>
                                    <View>
                                        <Text style={styles.bentoTitleSerif}>Other</Text>
                                        <Text style={styles.bentoSubtitleDark}>SHARE YOUR STORY</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.bentoCard, styles.cardAll]}
                                    onPress={() => handleCategoryPress("All")}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: '#37474F' }]}>
                                        <Ionicons name="grid" size={24} color="#FFFFFF" />
                                    </View>
                                    <View>
                                        <Text style={[styles.bentoTitleSerif, { color: '#FFFFFF' }]}>All Topics</Text>
                                        <Text style={[styles.bentoSubtitle, { color: '#B0BEC5' }]}>BROWSE ALL</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Top 10 Stories */}
                        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                            <Text style={styles.sectionTitle}>TOP 10 TODAY</Text>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.top10List}
                        >
                            {top10Posts.map((post, index) => (
                                <TouchableOpacity
                                    key={post.id}
                                    style={styles.top10Card}
                                    onPress={() => router.push(`/post/${post.id}`)}
                                >
                                    <View style={styles.top10Content}>
                                        {/* Rank Badge - Top Right */}
                                        <View style={styles.rankBadge}>
                                            <Text style={styles.rankBadgeText}>#{index + 1}</Text>
                                        </View>

                                        {/* Category Badge */}
                                        <View style={[styles.categoryPill, { backgroundColor: '#F3E5F5' }]}>
                                            <Text style={styles.categoryPillText}>{post.category}</Text>
                                        </View>

                                        {/* Author Info */}
                                        <View style={styles.top10Author}>
                                            <View style={styles.top10Avatar}>
                                                <Ionicons name="person" size={12} color="#9575cd" />
                                            </View>
                                            <Text style={styles.top10AuthorName} numberOfLines={1}>
                                                {post.authorName || "Anonymous"}
                                            </Text>
                                        </View>

                                        {/* Title */}
                                        <Text style={styles.top10Title} numberOfLines={2}>{post.title}</Text>

                                        {/* Description */}
                                        <Text style={styles.top10Description} numberOfLines={2}>
                                            {post.description}
                                        </Text>

                                        {/* Reactions Footer */}
                                        <View style={styles.top10Reactions}>
                                            <View style={styles.top10ReactionItem}>
                                                <Ionicons name="heart" size={12} color="#E57373" />
                                                <Text style={styles.top10ReactionText}>{Math.floor((post.reactionCount || 0) * 0.4)}</Text>
                                            </View>
                                            <View style={styles.top10ReactionItem}>
                                                <Ionicons name="hand-left" size={12} color="#FFB74D" />
                                                <Text style={styles.top10ReactionText}>{Math.floor((post.reactionCount || 0) * 0.3)}</Text>
                                            </View>
                                            <View style={styles.top10ReactionItem}>
                                                <Ionicons name="happy" size={12} color="#66BB6A" />
                                                <Text style={styles.top10ReactionText}>{Math.floor((post.reactionCount || 0) * 0.3)}</Text>
                                            </View>
                                            <View style={styles.top10CommentSection}>
                                                <Ionicons name="chatbubble-outline" size={12} color="#9E9E9E" />
                                                <Text style={styles.top10ReactionText}>{post.commentCount || 0}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Stories of the Day */}
                        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                            <Text style={styles.sectionTitle}>STORIES OF THE DAY</Text>
                            <Text style={styles.swipeHint}>Swipe to read</Text>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            pagingEnabled
                            decelerationRate="fast"
                            snapToInterval={width * 0.85 + 16}
                            contentContainerStyle={styles.storiesList}
                        >
                            {/* Static Featured Quote */}
                            <View style={styles.storyCard}>
                                <Ionicons name="chatbox-ellipses-outline" size={32} color="#E0E7FF" style={styles.quoteIcon} />
                                <Text style={styles.storyQuote}>
                                    "There is a crack in everything. That's how the light gets in."
                                </Text>
                                <View style={styles.divider} />
                                <Text style={styles.storyTag}>ON RESILIENCE</Text>
                            </View>

                            {/* Dynamic Stories from Posts */}
                            {posts.slice(0, 5).map(post => (
                                <TouchableOpacity
                                    key={post.id}
                                    style={styles.storyCard}
                                    onPress={() => router.push(`/post/${post.id}`)}
                                >
                                    <Ionicons name="chatbox-ellipses-outline" size={32} color="#E0E7FF" style={styles.quoteIcon} />
                                    <Text style={styles.storyQuote} numberOfLines={4}>
                                        "{post.description}"
                                    </Text>
                                    {post.authorName && (
                                        <Text style={styles.storyAuthor}>- {post.authorName}</Text>
                                    )}
                                    <View style={styles.divider} />
                                    <Text style={styles.storyTag}>ON {post.category.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Editorial Pick */}
                        <View style={styles.editorialSection}>
                            <Text style={styles.curatedTitle}>CURATED FOR YOU</Text>
                            <Text style={styles.editorialLabel}>EDITORIAL PICK</Text>

                            <Text style={styles.articleTitle}>
                                How to find quiet in a world that never stops talking.
                            </Text>

                            <Text style={styles.articleSnippet}>
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
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    scrollContent: {
        paddingBottom: 20,
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
        color: '#212121',
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
        backgroundColor: '#F5F5F5',
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
        color: "#212121",
        fontWeight: "500",
    },
    scrollContent: {
        paddingBottom: 80,
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
        width: 260,
        marginRight: 16,
    },
    top10Content: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: 16,
        padding: 14,
        height: 200,
        width: 260,
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        position: 'relative',
    },
    rankBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#263238',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        zIndex: 10,
    },
    rankBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    rankNumber: {
        display: 'none', // Deprecated - now using rankBadge
    },
    categoryPill: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    categoryPillText: {
        fontSize: 9,
        fontWeight: "700",
        color: "#7B1FA2",
        letterSpacing: 0.3,
    },
    top10Author: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
        gap: 6,
    },
    top10Avatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#EFE8FF",
        justifyContent: "center",
        alignItems: "center",
    },
    top10AuthorName: {
        fontSize: 10,
        fontWeight: "600",
        color: "#9575cd",
        flex: 1,
    },
    top10Title: {
        fontSize: 13,
        fontWeight: "700",
        color: "#212121",
        lineHeight: 17,
        marginBottom: 4,
    },
    top10Description: {
        fontSize: 11,
        fontWeight: "400",
        color: "#757575",
        lineHeight: 15,
        marginBottom: 8,
    },
    top10Reactions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    top10ReactionItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    top10ReactionText: {
        fontSize: 10,
        fontWeight: "600",
        color: "#757575",
    },
    top10CommentSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginLeft: "auto",
    },
    top10Stats: {
        display: 'none', // Deprecated
    },
    top10Footer: {
        display: 'none', // Deprecated
    },

    // Stories of the Day
    storiesList: {
        paddingHorizontal: 24,
    },
    storyCard: {
        width: width * 0.85,
        marginRight: 16,
        padding: 32,
        borderWidth: 1,
        borderColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },
    quoteIcon: {
        marginBottom: 24,
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
});
