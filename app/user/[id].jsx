import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import Avatar from "../../components/Avatar";
import PostCard from "../../components/PostCard";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

export default function UserProfile() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [userProfile, setUserProfile] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Format timestamp to "2h ago" style
    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return "";
        // Handle Firestore Timestamp
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    useEffect(() => {
        if (!id) return;

        const fetchUserAndPosts = async () => {
            try {
                // Fetch User Profile
                const userDocRef = doc(db, "users", id);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    setUserProfile(userDocSnap.data());
                } else {
                    console.log("No such user!");
                }

                // Fetch User's Public Posts
                // Query simplified even further: fetch all by author, filter & sort client-side
                // This avoids ALL index requirements for this specific view
                const postsRef = collection(db, "posts");
                const q = query(
                    postsRef,
                    where("authorId", "==", id)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedPosts = snapshot.docs
                        .map((doc) => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                ...data,
                                // timestamp formatted for display
                                timestamp: formatTimeAgo(data.createdAt),
                                // Keep raw timestamp for sorting
                                originalCreatedAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (new Date(data.createdAt).getTime() || 0)
                            };
                        })
                        // Filter out anonymous posts
                        .filter(post => !post.isAnonymous)
                        // Sort by date desc
                        .sort((a, b) => b.originalCreatedAt - a.originalCreatedAt);

                    setUserPosts(fetchedPosts);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error fetching user data:", error);
                setLoading(false);
            }
        };

        fetchUserAndPosts();
        fetchUserAndPosts();
    }, [id]);

    // Check if current user is following this user
    useEffect(() => {
        if (!currentUser || !id) return;

        const checkFollowStatus = async () => {
            try {
                const q = query(
                    collection(db, "friends"),
                    where("followerId", "==", currentUser.uid),
                    where("followingId", "==", id)
                );
                const snapshot = await getDocs(q);
                setIsFollowing(!snapshot.empty);
            } catch (error) {
                console.error("Error checking follow status:", error);
            }
        };

        checkFollowStatus();
    }, [currentUser, id]);

    const handleToggleFollow = async () => {
        if (!currentUser) return;
        setFollowLoading(true);

        try {
            if (isFollowing) {
                // Unfollow
                const q = query(
                    collection(db, "friends"),
                    where("followerId", "==", currentUser.uid),
                    where("followingId", "==", id)
                );
                const snapshot = await getDocs(q);
                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
                setIsFollowing(false);
            } else {
                // Follow
                await addDoc(collection(db, "friends"), {
                    followerId: currentUser.uid,
                    followingId: id,
                    createdAt: serverTimestamp(),
                });

                // Send Notification
                await addDoc(collection(db, "notifications"), {
                    type: "follow",
                    senderId: currentUser.uid,
                    recipientId: id,
                    message: "started following you",
                    read: false,
                    createdAt: new Date().toISOString(), // Using ISO string for simpler client-side consistency or serverTimestamp
                });

                setIsFollowing(true);
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
        } finally {
            setFollowLoading(false);
        }
    };

    const getUserRole = (user) => {
        if (!user) return "MEMBER";
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

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF8A65" />
                </View>
            </SafeAreaView>
        );
    }

    if (!userProfile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.header, { justifyContent: 'flex-start' }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1F2937" />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="person-remove-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.errorText}>User not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const role = getUserRole(userProfile);
    const roleColor = getRoleColor(role);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Profile Card */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Avatar seed={userProfile.profileCode || userProfile.email} size={100} />
                    </View>

                    <Text style={styles.displayName}>{userProfile.displayName}</Text>

                    <View style={[styles.roleBagde, { backgroundColor: `${roleColor}15` }]}>
                        <Text style={[styles.roleText, { color: roleColor }]}>{role}</Text>
                    </View>

                    {userProfile.bio ? (
                        <Text style={styles.bioText}>{userProfile.bio}</Text>
                    ) : null}

                    {/* Follow Button */}
                    {currentUser && currentUser.uid !== id && (
                        <TouchableOpacity
                            style={[
                                styles.followButton,
                                isFollowing && styles.followingButton
                            ]}
                            onPress={handleToggleFollow}
                            disabled={followLoading}
                        >
                            {followLoading ? (
                                <ActivityIndicator size="small" color={isFollowing ? "#6B7280" : "#FFF"} />
                            ) : (
                                <Text style={[
                                    styles.followButtonText,
                                    isFollowing && styles.followingButtonText
                                ]}>
                                    {isFollowing ? "Following" : "Follow"}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{userProfile.postCount || 0}</Text>
                            <Text style={styles.statLabel}>Stories</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{userProfile.loveSent || 0}</Text>
                            <Text style={styles.statLabel}>Love Sent</Text>
                        </View>
                    </View>
                </View>

                {/* Posts Section */}
                <View style={styles.postsSection}>
                    <Text style={styles.sectionTitle}>
                        Recent Stories
                        <Text style={styles.postCount}> ({userPosts.length})</Text>
                    </Text>

                    {userPosts.length > 0 ? (
                        userPosts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))
                    ) : (
                        <View style={styles.emptyPostsState}>
                            <Ionicons name="document-text-outline" size={40} color="#E5E7EB" />
                            <Text style={styles.emptyPostsText}>No public stories shared yet</Text>
                        </View>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: "center",
        paddingVertical: 32,
        paddingHorizontal: 20,
        borderBottomWidth: 8,
        borderBottomColor: "#F9FAFB",
    },
    avatarContainer: {
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    displayName: {
        fontSize: 24,
        fontWeight: "800",
        color: "#111827",
        marginBottom: 8,
    },
    roleBagde: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 16,
    },
    roleText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    bioText: {
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 24,
        lineHeight: 22,
        maxWidth: '80%',
    },
    followButton: {
        backgroundColor: "#1F2937",
        paddingVertical: 10,
        paddingHorizontal: 32,
        borderRadius: 24,
        marginBottom: 24,
        minWidth: 120,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    followingButton: {
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowOpacity: 0,
        elevation: 0,
    },
    followButtonText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    followingButtonText: {
        color: "#374151",
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 32,
        width: '100%',
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
    },
    statNumber: {
        fontSize: 20,
        fontWeight: "800",
        color: "#1F2937",
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#9CA3AF",
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: "#E5E7EB",
    },
    postsSection: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    postCount: {
        fontSize: 16,
        fontWeight: "500",
        color: "#9CA3AF",
    },
    emptyPostsState: {
        alignItems: "center",
        paddingVertical: 40,
        gap: 12,
    },
    emptyPostsText: {
        fontSize: 14,
        color: "#9CA3AF",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    errorText: {
        fontSize: 16,
        color: "#6B7280",
    }
});
