import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    if (isNaN(date.getTime())) return "Just now";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${diffWeeks}w ago`;
    if (diffDays < 365) return `${diffMonths}mon ago`;
    return `${diffYears}yr ago`;
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
        paddingHorizontal: 12,
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
        padding: 1,
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
