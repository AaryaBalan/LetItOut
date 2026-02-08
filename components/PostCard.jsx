import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";

const getCategoryColor = (category) => {
    const colors = {
        Study: "#FFE082",
        "Mental Health": "#B39DDB",
        Mindfulness: "#FFE082",
        Stress: "#EF9A9A",
        Anxiety: "#B39DDB",
        Relationship: "#F48FB1",
        Family: "#80CBC4",
    };
    return colors[category] || "#E0E0E0";
};

const getCategoryLabel = (category) => {
    const labels = {
        Study: "STUDY SUPPORT",
        "Mental Health": "MENTAL HEALTH",
        Mindfulness: "MINDFULNESS",
    };
    return labels[category] || category.toUpperCase();
};

const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Just now";

    // If timestamp is already a formatted string (like "5m ago"), return it
    if (typeof timestamp === 'string' && (timestamp.includes('ago') || timestamp === 'Just now')) {
        return timestamp;
    }

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) return "Just now";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function PostCard({ post, hideDescription = false }) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const router = useRouter();
    const [likeCount, setLikeCount] = useState(0);
    const [hugCount, setHugCount] = useState(0);
    const [meTooCount, setMeTooCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [comments, setComments] = useState([]);
    const [reactionCount, setReactionCount] = useState(post.reactionCount || 0);
    const [authorProfileCode, setAuthorProfileCode] = useState(null);
    const [commentorProfiles, setCommentorProfiles] = useState({});
    const [showShareModal, setShowShareModal] = useState(false);
    const [friends, setFriends] = useState([]);
    const [sharing, setSharing] = useState(false);

    // Fetch author profile code with real-time updates
    useEffect(() => {
        if (!post.authorId || post.isAnonymous) {
            setAuthorProfileCode(null);
            return;
        }

        const userRef = doc(db, "users", post.authorId);
        const unsubscribe = onSnapshot(
            userRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    setAuthorProfileCode(
                        userData.profileCode || userData.email || null,
                    );
                } else {
                    setAuthorProfileCode(null);
                }
            },
            (error) => {
                console.error("Error fetching author profile:", error);
                setAuthorProfileCode(null);
            }
        );

        return () => unsubscribe();
    }, [post.authorId, post.isAnonymous]);

    // Fetch reaction counts from Firebase in real-time
    useEffect(() => {
        if (!post.id) return;

        const reactionsRef = collection(db, "reactions");
        const q = query(reactionsRef, where("postId", "==", String(post.id)));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const counts = { like: 0, hug: 0, metoo: 0 };

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const type = data.type;

                if (type === "like") counts.like++;
                else if (type === "hug") counts.hug++;
                else if (type === "metoo") counts.metoo++;
            });

            setLikeCount(counts.like);
            setHugCount(counts.hug);
            setMeTooCount(counts.metoo);
        });

        return () => unsubscribe();
    }, [post.id]);

    // Fetch comment count from Firebase in real-time
    useEffect(() => {
        if (!post.id) return;

        const commentsRef = collection(db, "comments");
        const q = query(commentsRef, where("postId", "==", String(post.id)));

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            setCommentCount(snapshot.size);

            // Get up to 2 most recent comments
            const fetchedComments = snapshot.docs
                .map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .slice(0, 2);
            setComments(fetchedComments);

            // Fetch profile codes for commentors
            const profiles = {};
            for (const comment of fetchedComments) {
                if (comment.commentorId) {
                    try {
                        const userDoc = await getDoc(doc(db, "users", comment.commentorId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            profiles[comment.commentorId] = userData.profileCode || userData.email || null;
                        }
                    } catch (error) {
                        console.error("Error fetching commentor profile:", error);
                    }
                }
            }
            setCommentorProfiles(profiles);
        });

        return () => unsubscribe();
    }, [post.id]);

    // Calculate total reactionCount (reactions + comments)
    useEffect(() => {
        const total = likeCount + hugCount + meTooCount + commentCount;
        setReactionCount(total);
    }, [likeCount, hugCount, meTooCount, commentCount]);

    // Fetch friends list
    useEffect(() => {
        if (!user || !showShareModal) return;

        const fetchFriendsList = async () => {
            try {
                // Get people following the current user (Accepted)
                const followersQuery = query(
                    collection(db, "friends"),
                    where("followingId", "==", user.uid),
                    where("status", "==", 1)
                );

                // Get people the current user is following (Accepted)
                const followingQuery = query(
                    collection(db, "friends"),
                    where("followerId", "==", user.uid),
                    where("status", "==", 1)
                );

                const [followersSnap, followingSnap] = await Promise.all([
                    getDocs(followersQuery),
                    getDocs(followingQuery)
                ]);

                // Collect unique User IDs
                const friendIds = new Set();
                followersSnap.forEach(doc => friendIds.add(doc.data().followerId));
                followingSnap.forEach(doc => friendIds.add(doc.data().followingId));

                const ids = Array.from(friendIds);

                // Fetch user profiles
                const friendsList = [];
                for (const friendId of ids) {
                    if (friendId === user.uid) continue;

                    const userDoc = await getDoc(doc(db, "users", friendId));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        friendsList.push({
                            id: friendId,
                            name: userData.displayName || "Anonymous",
                            profileCode: userData.profileCode || userData.email || null,
                        });
                    }
                }

                setFriends(friendsList);
            } catch (error) {
                console.error("Error fetching friends:", error);
            }
        };

        fetchFriendsList();
    }, [user, showShareModal]);

    const handleShare = async (friendId) => {
        if (!user || sharing) return;

        setSharing(true);
        try {
            const chatId = [user.uid, friendId].sort().join("_");
            const chatRef = doc(db, "chats", chatId);

            const shareText = `Check out this post: "${post.title}"\n\n${post.description.substring(0, 100)}${post.description.length > 100 ? '...' : ''}\n\nTap to view: letitout://post/${post.id}`;

            await setDoc(chatRef, {
                participants: [user.uid, friendId],
                lastMessage: shareText,
                lastMessageTimestamp: serverTimestamp(),
                updatedAt: serverTimestamp(),
                [`unreadCount_${friendId}`]: increment(1),
            }, { merge: true });

            await addDoc(collection(db, "chats", chatId, "messages"), {
                text: shareText,
                senderId: user.uid,
                senderName: user.displayName || "Anonymous",
                createdAt: serverTimestamp(),
                type: "shared_post",
                sharedPost: {
                    id: post.id || "",
                    title: post.title || "Untitled Post",
                    description: post.description || "",
                    category: post.category || "General",
                    timestamp: post.timestamp || "",
                    authorName: post.authorName || "Anonymous",
                    isAnonymous: post.isAnonymous ?? true,
                    authorId: post.authorId || "",
                }
            });

            Alert.alert("Success", "Post shared successfully!");
            setShowShareModal(false);
        } catch (error) {
            console.error("Error sharing post:", error);
            Alert.alert("Error", "Failed to share post");
        } finally {
            setSharing(false);
        }
    };

    return (
        <View style={{
            borderBottomWidth: 1,
            borderBottomColor: theme.isDark ? '#333333' : '#E0E0E0',
            paddingBottom: 12,
            marginBottom: 16
        }}>
            <Link href={`/post/${post.id}`} asChild>
                <TouchableOpacity style={[styles.card, {
                    backgroundColor: theme.card
                }]}>
                    {/* Author Section with Category Badge */}
                    <TouchableOpacity
                        style={styles.authorSection}
                        onPress={(e) => {
                            e.stopPropagation(); // Prevent navigating to post details
                            if (post.authorId && !post.isAnonymous) {
                                if (user && user.uid === post.authorId) {
                                    router.push("/(tabs)/profile");
                                } else {
                                    router.push(`/user/${post.authorId}`);
                                }
                            }
                        }}
                        disabled={post.isAnonymous || !post.authorId}
                    >
                        {post.isAnonymous ||
                            !post.authorName ||
                            post.authorName === "Anonymous" ||
                            !authorProfileCode ? (
                            <View style={styles.avatarWrapper}>
                                <Image
                                    source={require("../assets/images/letitout_logo.png")}
                                    style={{ width: 40, height: 40, borderRadius: 20 }}
                                />
                            </View>
                        ) : (
                            <View style={styles.avatarWrapper}>
                                <Avatar seed={authorProfileCode} size={40} />
                            </View>
                        )}
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.authorName, { color: theme.text }]}>
                                {post.isAnonymous || !post.authorName
                                    ? "Anonymous"
                                    : post.authorName}
                            </Text>
                            <Text style={[styles.timestamp, { color: theme.textSecondary }]}>{formatTimestamp(post.timestamp)}</Text>
                        </View>
                        <View
                            style={[
                                styles.categoryBadge,
                                { backgroundColor: getCategoryColor(post.category) },
                            ]}
                        >
                            <Text style={styles.categoryText}>
                                {getCategoryLabel(post.category)}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.title, { color: theme.text }]}>{post.title}</Text>

                    {!hideDescription && (
                        <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={3}>
                            {post.description}
                        </Text>
                    )}

                    {/* Comments Preview */}
                    {comments.length > 0 && (
                        <View style={[styles.commentsPreview, { backgroundColor: theme.isDark ? '#0A0A0A' : '#F9F9F9', borderColor: theme.border }]}>
                            {comments.map((comment) => (
                                <View key={comment.id} style={[styles.commentItem, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F5F5F5' }]}>
                                    <Avatar
                                        seed={commentorProfiles[comment.commentorId] || "anonymous"}
                                        size={35}
                                        style={styles.commentAvatar}
                                    />
                                    <View style={styles.commentTextContainer}>
                                        <Text style={[styles.commentUsername, { color: theme.text }]}>
                                            {comment.commentorName || "Anonymous"}
                                        </Text>
                                        <Text style={[styles.commentText, { color: theme.textSecondary }]} numberOfLines={2}>
                                            {comment.text || comment.comment}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.footer}>
                        <View style={styles.reactions}>
                            <View style={styles.reactionButton}>
                                <Ionicons name="heart" size={16} color="#E57373" />
                                <Text style={[styles.reactionCount, { color: theme.textSecondary }]}>{likeCount}</Text>
                            </View>

                            <View style={styles.reactionButton}>
                                <Ionicons name="hand-left" size={16} color="#FFB74D" />
                                <Text style={[styles.reactionCount, { color: theme.textSecondary }]}>{hugCount}</Text>
                            </View>

                            <View style={styles.reactionButton}>
                                <Ionicons name="happy" size={16} color="#66BB6A" />
                                <Text style={[styles.reactionCount, { color: theme.textSecondary }]}>{meTooCount}</Text>
                            </View>
                        </View>

                        <View style={styles.rightFooter}>
                            <TouchableOpacity
                                style={styles.shareButton}
                                onPress={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowShareModal(true);
                                }}
                            >
                                <Ionicons name="paper-plane-outline" size={20} color="#9F8BFF" />
                                <Text style={styles.sendText}>Send</Text>
                            </TouchableOpacity>

                            <View style={styles.commentSection}>
                                <Ionicons
                                    name="chatbubble-outline"
                                    size={18}
                                    color={theme.textTertiary}
                                />
                                <Text style={[styles.commentCount, { color: theme.textSecondary }]}>{commentCount}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Share Modal */}
                    <Modal
                        visible={showShareModal}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowShareModal(false)}
                    >
                        <Pressable
                            style={[styles.modalOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}
                            onPress={() => setShowShareModal(false)}
                        >
                            <Pressable style={[styles.modalContent, { backgroundColor: theme.isDark ? '#1A1A1A' : theme.surface }]} onPress={(e) => e.stopPropagation()}>
                                <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                                    <Text style={[styles.modalTitle, { color: theme.text }]}>Share with Friends</Text>
                                    <TouchableOpacity onPress={() => setShowShareModal(false)}>
                                        <Ionicons name="close" size={24} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {friends.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
                                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No friends to share with</Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={friends}
                                        keyExtractor={(item) => item.id}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[styles.friendItem, { borderBottomColor: theme.divider }]}
                                                onPress={() => handleShare(item.id)}
                                                disabled={sharing}
                                            >
                                                {item.profileCode ? (
                                                    <Avatar seed={item.profileCode} size={40} />
                                                ) : (
                                                    <View style={[styles.defaultAvatar, { backgroundColor: theme.isDark ? '#1A1A1A' : '#EFE8FF' }]}>
                                                        <Ionicons name="person" size={20} color="#9575cd" />
                                                    </View>
                                                )}
                                                <Text style={[styles.friendName, { color: theme.text }]}>{item.name}</Text>
                                                <Ionicons name="paper-plane" size={20} color="#9F8BFF" />
                                            </TouchableOpacity>
                                        )}
                                    />
                                )}
                            </Pressable>
                        </Pressable>
                    </Modal>
                </TouchableOpacity>
            </Link>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    categoryText: {
        fontSize: 9,
        fontWeight: "700",
        color: "#212121",
        letterSpacing: 0.3,
    },
    timestamp: {
        fontSize: 11,
        color: "#BDBDBD",
    },
    authorSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    avatarWrapper: {
        marginRight: 8,
    },
    avatarContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#EFE8FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    avatarText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#9575cd",
    },
    authorName: {
        fontSize: 12,
        fontWeight: "600",
        color: "#9575cd",
    },
    title: {
        fontSize: 15,
        fontWeight: "700",
        marginBottom: 6,
        lineHeight: 20,
    },
    preview: {
        fontSize: 13,
        color: "#757575",
        lineHeight: 18,
        marginBottom: 14,
    },
    commentsPreview: {
        marginBottom: 12,
        gap: 8,
    },
    commentItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: "row",
        gap: 10,
    },
    commentAvatar: {
        marginTop: 2,
    },
    commentTextContainer: {
        flex: 1,
        gap: 2,
    },
    commentUsername: {
        fontSize: 12,
        fontWeight: "600",
        color: "#212121",
    },
    commentText: {
        fontSize: 12,
        color: "#616161",
        lineHeight: 16,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    reactions: {
        flexDirection: "row",
        gap: 16,
    },
    reactionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    reactionCount: {
        fontSize: 12,
        fontWeight: "600",
        color: "#757575",
    },
    reactionActive: {
        color: "#E57373",
    },
    reactionActiveHug: {
        color: "#FFB74D",
    },
    commentSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    commentCount: {
        fontSize: 12,
        fontWeight: "600",
        color: "#757575",
    },
    shareButton: {
        padding: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sendText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#9F8BFF",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '85%',
        maxHeight: '70%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#212121',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#9E9E9E',
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    defaultAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFE8FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#212121',
    },
    rightFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
});
