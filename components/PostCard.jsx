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

const getCategoryColors = (category, isDark) => {
    const normalized = category === "Anxiety" ? "Stress" : (category === "Mindfulness" ? "Mental Health" : category);
    const colors = {
        "Family": { bg: isDark ? "#174EA6" : "#E8F0FE", text: isDark ? "#8AB4F8" : "#1A73E8" },
        "Stress": { bg: isDark ? "#C5221F" : "#FCE8E6", text: isDark ? "#F28B82" : "#D93025" },
        "Relationship": { bg: isDark ? "#880E4F" : "#FCE4EC", text: isDark ? "#F8BBD0" : "#C2185B" },
        "Study": { bg: isDark ? "#137333" : "#E6F4EA", text: isDark ? "#81C995" : "#188038" },
        "Mental Health": { bg: isDark ? "#E37400" : "#FEF7E0", text: isDark ? "#FDD663" : "#B06000" },
        "Other": { bg: isDark ? "#3C4043" : "#F1F3F4", text: isDark ? "#E8EAED" : "#3C4043" },
    };
    return colors[normalized] || colors["Other"];
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
        <View style={[styles.cardContainer, { borderBottomColor: theme.isDark ? '#2D2D30' : '#E5E7EB' }]}>
            <Link href={`/post/${post.id}`} asChild>
                <TouchableOpacity style={styles.card} delayPressIn={0}>
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
                        delayPressIn={0}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            {post.isAnonymous ||
                                !post.authorName ||
                                post.authorName === "Anonymous" ||
                                !authorProfileCode ? (
                                <View style={styles.avatarWrapper}>
                                    <Image
                                        source={require("../assets/images/letitout_logo.png")}
                                        style={{ width: 36, height: 36, borderRadius: 18 }}
                                    />
                                </View>
                            ) : (
                                <View style={styles.avatarWrapper}>
                                    <Avatar seed={authorProfileCode} size={36} />
                                </View>
                            )}
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.authorName, { color: theme.text }]} numberOfLines={1}>
                                    {post.isAnonymous || !post.authorName
                                        ? "Anonymous"
                                        : post.authorName}
                                </Text>
                                <Text style={[styles.timestamp, { color: theme.textSecondary }]}>{formatTimestamp(post.timestamp)}</Text>
                            </View>
                        </View>
                        <View
                            style={[
                                styles.categoryBadge,
                                { backgroundColor: getCategoryColors(post.category, theme.isDark).bg },
                            ]}
                        >
                            <Text style={[styles.categoryText, { color: getCategoryColors(post.category, theme.isDark).text }]}>
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
                        <View style={[styles.commentsPreview, { backgroundColor: theme.isDark ? '#1F1F21' : '#F9F9FB', borderColor: theme.border }]}>
                            {comments.map((comment) => (
                                <View key={comment.id} style={[styles.commentItem, { backgroundColor: 'transparent' }]}>
                                    <Avatar
                                        seed={commentorProfiles[comment.commentorId] || "anonymous"}
                                        size={30}
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
                            <View style={[styles.reactionPill, { backgroundColor: theme.isDark ? '#252528' : '#F1F3F5', borderColor: theme.border }]}>
                                <Ionicons name="heart" size={14} color="#E57373" />
                                <Text style={[styles.reactionCount, { color: theme.textSecondary }]}>{likeCount}</Text>
                            </View>

                            <View style={[styles.reactionPill, { backgroundColor: theme.isDark ? '#252528' : '#F1F3F5', borderColor: theme.border }]}>
                                <Ionicons name="hand-left" size={14} color="#FFB74D" />
                                <Text style={[styles.reactionCount, { color: theme.textSecondary }]}>{hugCount}</Text>
                            </View>

                            <View style={[styles.reactionPill, { backgroundColor: theme.isDark ? '#252528' : '#F1F3F5', borderColor: theme.border }]}>
                                <Ionicons name="happy" size={14} color="#66BB6A" />
                                <Text style={[styles.reactionCount, { color: theme.textSecondary }]}>{meTooCount}</Text>
                            </View>
                        </View>

                        <View style={styles.rightFooter}>
                            <TouchableOpacity
                                style={[styles.actionPill, { backgroundColor: theme.isDark ? '#252528' : '#F1F3F5', borderColor: theme.border }]}
                                delayPressIn={0}
                                onPress={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowShareModal(true);
                                }}
                            >
                                <Ionicons name="paper-plane-outline" size={14} color="#9F8BFF" />
                                <Text style={styles.sendText}>Send</Text>
                            </TouchableOpacity>

                            <View style={[styles.actionPill, { backgroundColor: theme.isDark ? '#252528' : '#F1F3F5', borderColor: theme.border }]}>
                                <Ionicons
                                    name="chatbubble-outline"
                                    size={14}
                                    color={theme.textSecondary}
                                />
                                <Text style={[styles.commentCount, { color: theme.textSecondary }]}>{commentCount}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Share Modal */}
                    <Modal
                        visible={showShareModal}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowShareModal(false)}
                    >
                        <Pressable
                            style={styles.modalOverlay}
                            onPress={() => setShowShareModal(false)}
                        >
                            <Pressable style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]} onPress={(e) => e.stopPropagation()}>
                                <View style={[styles.modalHeader, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="share-social-outline" size={22} color={theme.text} />
                                        <Text style={[styles.modalTitle, { color: theme.text }]}>Share with Friends</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowShareModal(false)} style={styles.modalCloseBtn} delayPressIn={0}>
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
                                        showsVerticalScrollIndicator={false}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={[styles.friendItem, { borderBottomColor: theme.border }]}
                                                onPress={() => handleShare(item.id)}
                                                disabled={sharing}
                                                delayPressIn={0}
                                            >
                                                {item.profileCode ? (
                                                    <Avatar seed={item.profileCode} size={40} />
                                                ) : (
                                                    <View style={[styles.defaultAvatar, { backgroundColor: theme.isDark ? '#2D2D2D' : '#EFE8FF' }]}>
                                                        <Ionicons name="person" size={20} color="#9575cd" />
                                                    </View>
                                                )}
                                                <Text style={[styles.friendName, { color: theme.text }]}>{item.name}</Text>
                                                <Ionicons name="paper-plane" size={18} color="#9F8BFF" />
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
    cardContainer: {
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e02f",
        paddingBottom: 5,
        marginBottom: 5,
    },
    card: {
        paddingVertical: 12,
        paddingHorizontal: 5,
    },
    categoryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    categoryText: {
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    timestamp: {
        fontSize: 11,
        marginTop: 2,
    },
    authorSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    avatarWrapper: {
        marginRight: 2,
    },
    authorName: {
        fontSize: 14,
        fontWeight: "700",
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 8,
        lineHeight: 22,
    },
    preview: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 14,
    },
    commentsPreview: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 10,
        gap: 8,
        marginBottom: 14,
    },
    commentItem: {
        paddingHorizontal: 10,
        paddingVertical: 8,
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
        fontWeight: "700",
    },
    commentText: {
        fontSize: 12,
        lineHeight: 16,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    reactions: {
        flexDirection: "row",
        gap: 8,
    },
    reactionPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    actionPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    reactionCount: {
        fontSize: 12,
        fontWeight: "700",
    },
    commentCount: {
        fontSize: 12,
        fontWeight: "700",
    },
    sendText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9F8BFF",
    },
    rightFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    modalCloseBtn: {
        padding: 4,
    },
    emptyState: {
        paddingVertical: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        gap: 12,
        borderBottomWidth: 1,
    },
    defaultAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
});
