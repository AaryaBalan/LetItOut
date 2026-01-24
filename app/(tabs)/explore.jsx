import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
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
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

export default function Explore() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [posts, setPosts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("posts"); // "posts" or "people"
    const [peopleSort, setPeopleSort] = useState("stories"); // "stories" or "love"

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

    // Fetch all users from Firebase
    useEffect(() => {
        const usersRef = collection(db, "users");
        const q = query(usersRef);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetchedUsers = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        displayName: data.displayName || "Anonymous",
                        email: data.email,
                        profileCode: data.profileCode || data.email,
                        bio: data.bio || "",
                        postCount: data.postCount || 0,
                        loveSent: data.loveSent || 0,
                    };
                });
                setUsers(fetchedUsers);
            },
            (error) => {
                console.error("Error fetching users:", error);
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

    // Filter users based on search query
    const filteredUsers = searchQuery.trim()
        ? users.filter((user) => {
            const query = searchQuery.toLowerCase();
            return (
                user.displayName?.toLowerCase().includes(query) ||
                user.bio?.toLowerCase().includes(query)
            );
        })
        : users;

    // Sort users based on selected criteria
    const sortedUsers = [...filteredUsers].sort((a, b) => {
        if (peopleSort === "stories") {
            return b.postCount - a.postCount;
        } else {
            return b.loveSent - a.loveSent;
        }
    });

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

    const getUserRole = (user) => {
        if (user.postCount >= 100) return "ALLY";
        if (user.loveSent >= 500) return "LISTENER";
        if (user.postCount >= 50) return "SUPPORTER";
        if (user.loveSent >= 200) return "GUIDE";
        if (user.loveSent >= 100) return "VOICE";
        if (user.postCount >= 20) return "HEALER";
        return "MEMBER";
    };

    const getRoleColor = (role) => {
        const colors = {
            "ALLY": "#B39DDB",
            "LISTENER": "#FF8A65",
            "SUPPORTER": "#81C784",
            "GUIDE": "#4DD0E1",
            "VOICE": "#F48FB1",
            "HEALER": "#AED581",
            "MEMBER": "#BDBDBD",
        };
        return colors[role] || "#BDBDBD";
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F8F8" translucent={false} />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore</Text>
                <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="notifications-outline" size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <View style={styles.tabWrapper}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === "posts" && styles.tabButtonActive
                        ]}
                        onPress={() => setActiveTab("posts")}
                    >
                        <Text style={[
                            styles.tabButtonText,
                            activeTab === "posts" && styles.tabButtonTextActive
                        ]}>
                            Posts
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            activeTab === "people" && styles.tabButtonActive
                        ]}
                        onPress={() => setActiveTab("people")}
                    >
                        <Text style={[
                            styles.tabButtonText,
                            activeTab === "people" && styles.tabButtonTextActive
                        ]}>
                            People
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                stickyHeaderIndices={[0]}
            >
                {/* Search Bar */}
                <View style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={activeTab === "posts" ? "Search topics..." : "Find people..."}
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
                                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Content based on active tab */}
                {activeTab === "posts" ? (
                    <>
                        {searchQuery.trim() ? (
                            <View style={styles.resultsSection}>
                                <Text style={styles.sectionLabel}>
                                    {filteredPosts.length > 0
                                        ? `Found ${filteredPosts.length} post${filteredPosts.length !== 1 ? 's' : ''}`
                                        : 'No posts found'}
                                </Text>
                                <View style={styles.postsList}>
                                    {filteredPosts.map((post) => (
                                        <PostCard key={post.id} post={post} />
                                    ))}
                                </View>
                            </View>
                        ) : (
                            <View style={styles.categoriesSection}>
                                <Text style={styles.sectionHeaderTitle}>categories</Text>
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
                    </>
                ) : (
                    <>
                        {/* People Sort Toggle */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.peopleSortContainer}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.pillButton,
                                    peopleSort === "stories" && styles.pillButtonActive
                                ]}
                                onPress={() => setPeopleSort("stories")}
                            >
                                <Text style={[
                                    styles.pillButtonText,
                                    peopleSort === "stories" && styles.pillButtonTextActive
                                ]}>
                                    Most Stories
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.pillButton,
                                    peopleSort === "love" && styles.pillButtonActive
                                ]}
                                onPress={() => setPeopleSort("love")}
                            >
                                <Text style={[
                                    styles.pillButtonText,
                                    peopleSort === "love" && styles.pillButtonTextActive
                                ]}>
                                    Most Love Sent
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* People List */}
                        <View style={styles.peopleListContainer}>
                            {loading ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="#E57373" />
                                </View>
                            ) : sortedUsers.length > 0 ? (
                                sortedUsers.map((user) => {
                                    const role = getUserRole(user);
                                    const roleColor = getRoleColor(role);

                                    return (
                                        <TouchableOpacity
                                            key={user.id}
                                            style={styles.personItem}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                if (currentUser && user.id === currentUser.uid) {
                                                    router.push("/profile");
                                                } else {
                                                    router.push(`/user/${user.id}`);
                                                }
                                            }}
                                        >
                                            <View style={styles.personLeft}>
                                                <Avatar seed={user.profileCode} size={44} />
                                                <View style={styles.personInfo}>
                                                    <View style={styles.nameRoleContainer}>
                                                        <Text style={styles.personName} numberOfLines={1}>{user.displayName}</Text>
                                                        <View style={[styles.roleBagde, { backgroundColor: `${roleColor}15` }]}>
                                                            <Text style={[styles.roleText, { color: roleColor }]}>{role}</Text>
                                                        </View>
                                                    </View>
                                                    <Text style={styles.personBio} numberOfLines={2}>
                                                        {user.bio || "No bio yet"}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.statContainer}>
                                                <Text style={styles.statNumber}>
                                                    {peopleSort === "stories"
                                                        ? user.postCount
                                                        : user.loveSent > 1000
                                                            ? `${(user.loveSent / 1000).toFixed(1)}k`
                                                            : user.loveSent}
                                                </Text>
                                                <Text style={styles.statLabel}>
                                                    {peopleSort === "stories" ? "Stories" : "Loves"}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            ) : (
                                <View style={styles.emptyState}>
                                    <Ionicons name="people-outline" size={48} color="#E0E0E0" />
                                    <Text style={styles.emptyStateText}>No users found matching your search</Text>
                                </View>
                            )}
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: "#111827",
        letterSpacing: -0.5,
    },
    iconButton: {
        padding: 8,
        backgroundColor: "#F3F4F6",
        borderRadius: 20,
    },
    tabWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: "#FFFFFF",
        zIndex: 10,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#F9FAFB",
        padding: 4,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: "center",
        borderRadius: 12,
    },
    tabButtonActive: {
        backgroundColor: "#E57373",
        borderColor: "#E57373",
        shadowColor: "#E57373",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    tabButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    tabButtonTextActive: {
        color: "#FFFFFF",
    },
    scrollContent: {
        paddingBottom: 80,
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 4,
        backgroundColor: "#FFFFFF",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: "#1F2937",
        padding: 0,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
        marginLeft: 20,
        marginBottom: 12,
        marginTop: 8,
    },
    sectionHeaderTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 16,
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
    // People Tab Styles
    peopleSortContainer: {
        paddingHorizontal: 20,
        marginBottom: 8,
        flexDirection: 'row',
        gap: 8,
    },
    pillButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "transparent",
    },
    pillButtonActive: {
        backgroundColor: "#FFCDD2", // Family card bg
        borderColor: "#E57373",
    },
    pillButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
    },
    pillButtonTextActive: {
        color: "#E57373",
    },
    peopleListContainer: {
        marginTop: 8,
    },
    personItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    personLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: 12,
    },
    personInfo: {
        flex: 1,
        justifyContent: 'center',
        marginRight: 8,
    },
    nameRoleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 2,
        gap: 6,
    },
    personName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1F2937",
    },
    personBio: {
        fontSize: 12,
        color: "#9CA3AF",
        lineHeight: 16,
    },
    roleBagde: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    roleText: {
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    statContainer: {
        alignItems: 'flex-end',
        minWidth: 60,
    },
    statNumber: {
        fontSize: 16,
        fontWeight: "800",
        color: "#1F2937",
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: "500",
        color: "#9CA3AF",
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyStateText: {
        color: "#9CA3AF",
        fontSize: 14,
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: "center",
    },
    resultsSection: {
        marginTop: 8,
    },
    postsList: {
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    }
});
