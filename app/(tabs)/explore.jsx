import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, onSnapshot, query } from "firebase/firestore";
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
import Avatar from "../../components/Avatar";
import PostCard from "../../components/PostCard";
import TabScreenWrapper from "../../components/TabScreenWrapper";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const { width } = Dimensions.get('window');

export default function Explore() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState("");
    const [posts, setPosts] = useState([]);
    const [authorProfiles, setAuthorProfiles] = useState({});
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

    // Fetch author profile codes for top 10 posts
    useEffect(() => {
        const fetchAuthorProfiles = async () => {
            const profiles = {};
            const top10 = [...posts]
                .sort((a, b) => (b.reactionCount + b.commentCount) - (a.reactionCount + a.commentCount))
                .slice(0, 10);

            for (const post of top10) {
                if (post.authorId && !post.isAnonymous) {
                    try {
                        const userRef = doc(db, "users", post.authorId);
                        const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
                            if (docSnapshot.exists()) {
                                const userData = docSnapshot.data();
                                setAuthorProfiles(prev => ({
                                    ...prev,
                                    [post.authorId]: userData.profileCode || userData.email || null
                                }));
                            }
                        });
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
                                    <View style={[styles.logoContainer, { backgroundColor: theme.isDark ? '#1A1A1A' : '#E1D5F4' }]}>
                                        <Ionicons name="compass" size={28} color="#9575cd" />
                                    </View>
                                    <View>
                                        <Text style={[styles.headerTitle, { color: theme.text }]}>Explore</Text>
                                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Discover & Connect</Text>
                                    </View>
                                </View>
                                <View style={styles.headerRight}>
                                    <TouchableOpacity
                                        style={[styles.iconButton, { backgroundColor: theme.isDark ? '#2A2A2A' : '#F5F5F5' }]}
                                        onPress={() => router.push("/notifications")}
                                    >
                                        <Ionicons name="notifications-outline" size={24} color={theme.text} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Enhanced Search Bar */}
                            <View style={styles.searchContainer}>
                                <View style={[styles.searchBar, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
                                    <Ionicons name="search" size={20} color="#9575cd" />
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
                            {/* Discovery - Bento Grid */}
                            <View style={[styles.sectionHeader, { backgroundColor: theme.surface }]}>
                                <Text style={[styles.sectionTitle, { color: theme.text }]}>DISCOVERY</Text>
                            </View>

                            <View style={[styles.bentoGrid, { backgroundColor: theme.surface }]}>
                                {/* Feed Card - Wide */}
                                <TouchableOpacity
                                    style={[styles.bentoCard, styles.cardFeed, theme.isDark && { backgroundColor: '#1A1A2E' }]}
                                    onPress={() => router.push("/(tabs)/home")}
                                >
                                    <View style={styles.cardContentHorizontal}>
                                        <View>
                                            <Text style={[styles.bentoTitleBig, theme.isDark && { color: '#FFFFFF' }]}>Your Feed</Text>
                                            <Text style={[styles.bentoSubtitleDark, theme.isDark && { color: '#B0BEC5' }]}>LATEST UPDATES</Text>
                                        </View>
                                        <View style={[styles.iconCircle, { backgroundColor: '#FFFFFF' }]}>
                                            <Ionicons name="newspaper" size={24} color="#5C6BC0" />
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                {/* Row 1: Mental Health & Stress */}
                                <View style={styles.bentoRow}>
                                    <TouchableOpacity
                                        style={[styles.bentoCard, styles.cardHealing, theme.isDark && { backgroundColor: '#2A2419' }]}
                                        onPress={() => handleCategoryPress("Mental Health")}
                                    >
                                        <View style={styles.iconCircle}>
                                            <Ionicons name="fitness" size={24} color="#C8A656" />
                                        </View>
                                        <View>
                                            <Text style={[styles.bentoTitleSerif, theme.isDark && { color: '#FFFFFF' }]}>Mental Health</Text>
                                            <Text style={[styles.bentoSubtitle, theme.isDark && { color: '#B0BEC5' }]}>DAILY WELLBEING</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.bentoCard, styles.cardAnxiety, theme.isDark && { backgroundColor: '#1E1A2A' }]}
                                        onPress={() => handleCategoryPress("Stress")}
                                    >
                                        <View style={styles.iconCircle}>
                                            <Ionicons name="leaf" size={24} color="#7C6BA8" />
                                        </View>
                                        <View>
                                            <Text style={[styles.bentoTitleSerif, theme.isDark && { color: '#FFFFFF' }]}>Stress</Text>
                                            <Text style={[styles.bentoSubtitle, theme.isDark && { color: '#B0BEC5' }]}>FINDING PEACE</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                {/* Row 2: Relationship (Wide) */}
                                <TouchableOpacity
                                    style={[styles.bentoCard, styles.cardRelationships, theme.isDark && { backgroundColor: '#2A1E24' }]}
                                    onPress={() => handleCategoryPress("Relationship")}
                                >
                                    <View style={styles.cardContentHorizontal}>
                                        <View>
                                            <Text style={[styles.bentoTitleBig, theme.isDark && { color: '#FFFFFF' }]}>Relationship</Text>
                                            <Text style={[styles.bentoSubtitleDark, theme.isDark && { color: '#B0BEC5' }]}>LOVE & CONNECTION</Text>
                                        </View>
                                        <Ionicons name="heart" size={48} color="rgba(244, 143, 177, 0.5)" />
                                    </View>
                                </TouchableOpacity>

                                {/* Row 3: Family & Study */}
                                <View style={styles.bentoRow}>
                                    <TouchableOpacity
                                        style={[styles.bentoCard, styles.cardFamily, theme.isDark && { backgroundColor: '#2A1919' }]}
                                        onPress={() => handleCategoryPress("Family")}
                                    >
                                        <View style={styles.iconCircle}>
                                            <Ionicons name="home" size={24} color="#E57373" />
                                        </View>
                                        <View>
                                            <Text style={[styles.bentoTitleSerif, theme.isDark && { color: '#FFFFFF' }]}>Family</Text>
                                            <Text style={[styles.bentoSubtitle, theme.isDark && { color: '#B0BEC5' }]}>HOME SUPPORT</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.bentoCard, styles.cardStudy, theme.isDark && { backgroundColor: '#19252A' }]}
                                        onPress={() => handleCategoryPress("Study")}
                                    >
                                        <View style={styles.iconCircle}>
                                            <Ionicons name="school" size={24} color="#5FA49C" />
                                        </View>
                                        <View>
                                            <Text style={[styles.bentoTitleSerif, theme.isDark && { color: '#FFFFFF' }]}>Study</Text>
                                            <Text style={[styles.bentoSubtitle, theme.isDark && { color: '#B0BEC5' }]}>CAREER & GROWTH</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                {/* Row 4: Other & All Topics */}
                                <View style={styles.bentoRow}>
                                    <TouchableOpacity
                                        style={[styles.bentoCard, styles.cardOther, theme.isDark && { backgroundColor: '#1F2228' }]}
                                        onPress={() => handleCategoryPress("Other")}
                                    >
                                        <View style={styles.iconCircle}>
                                            <Ionicons name="ellipsis-horizontal" size={24} color="#90A4AE" />
                                        </View>
                                        <View>
                                            <Text style={[styles.bentoTitleSerif, theme.isDark && { color: '#FFFFFF' }]}>Other</Text>
                                            <Text style={[styles.bentoSubtitleDark, theme.isDark && { color: '#B0BEC5' }]}>SHARE YOUR STORY</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.bentoCard, styles.cardAll, theme.isDark && { backgroundColor: '#1A1A1A' }]}
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
                                                    source={require("../../assets/images/letitout_logo.png")}
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
                                                    source={require("../../assets/images/letitout_logo.png")}
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
                                    <Ionicons name="arrow-forward-circle" size={48} color="#9575cd" />
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
        width: width * 0.85,
        marginRight: 16,
        padding: 32,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
        position: 'relative',
    },
    rankBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#9575cd',
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
        borderWidth: 1,
        borderColor: "#f0f0f0",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
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
});
