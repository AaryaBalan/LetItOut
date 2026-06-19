import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";

const getCategoryColors = (category, isDark) => {
    const normalized = category === "Anxiety" ? "Stress" : (category === "Mindfulness" ? "Mental Health" : category);
    const colors = {
        "Family": { bg: isDark ? "#EBF3FE" : "#EBF3FE", text: isDark ? "#8AB4F8" : "#2F80ED" },
        "Stress": { bg: isDark ? "#FCEEEE" : "#FCEEEE", text: isDark ? "#F28B82" : "#EB5757" },
        "Relationship": { bg: isDark ? "#FEF9E6" : "#FEF9E6", text: isDark ? "#F8BBD0" : "#F2C94C" },
        "Study": { bg: isDark ? "#E9F7EF" : "#E9F7EF", text: isDark ? "#81C995" : "#27AE60" },
        "Mental Health": { bg: isDark ? "#EEF2FF" : "#EEF2FF", text: isDark ? "#FDD663" : "#6366F1" },
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
        <View style={styles.cardContainer}>
            {/* Background Blob Elements based on category */}
            <View style={styles.blobContainer}>
                {post.category === "Stress" || post.category === "Anxiety" ? (
                    <Ionicons name="flower" size={140} color="#FCEEEE" style={[styles.blobIcon, { transform: [{ rotate: '45deg' }, { scale: 1.5 }] }]} />
                ) : post.category === "Study" || post.category === "Study Support" ? (
                    <Ionicons name="leaf" size={160} color="#E9F7EF" style={[styles.blobIcon, { transform: [{ rotate: '-30deg' }, { scale: 1.3 }] }]} />
                ) : post.category === "Relationship" ? (
                    <Ionicons name="heart" size={180} color="#FEF9E6" style={[styles.blobIcon, { transform: [{ rotate: '15deg' }, { scale: 1.2 }] }]} />
                ) : post.category === "Family" ? (
                    <Ionicons name="people" size={140} color="#EBF3FE" style={[styles.blobIcon, { opacity: 0.5, transform: [{ scale: 1.4 }] }]} />
                ) : (
                    <View style={styles.otherBlobWrapper}>
                        <View style={styles.otherBlobShape} />
                        <MaterialCommunityIcons name="ghost" size={50} color="#D8D8FE" style={styles.otherBlobGhost} />
                    </View>
                )}
            </View>

            <Link href={`/post/${post.id}`} asChild>
                <TouchableOpacity style={styles.card} delayPressIn={0}>
                    {/* Author Section */}
                    <View style={styles.authorSection}>
                        <TouchableOpacity
                            style={styles.authorInfo}
                            onPress={(e) => {
                                e.stopPropagation();
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
                            {post.isAnonymous || !post.authorName || post.authorName === "Anonymous" || !authorProfileCode ? (
                                <View style={styles.avatarWrapperGhost}>
                                    <MaterialCommunityIcons name="ghost-outline" size={20} color="#111827" />
                                </View>
                            ) : (
                                <View style={styles.avatarWrapper}>
                                    <Avatar seed={authorProfileCode} size={40} />
                                </View>
                            )}
                            <View>
                                <Text style={[styles.authorName, { color: theme.text }]} numberOfLines={1}>
                                    {post.isAnonymous || !post.authorName ? "Anonymous" : post.authorName}
                                </Text>
                                <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
                                    {formatTimestamp(post.timestamp)}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.headerRight}>
                            <View style={[styles.categoryBadge, { backgroundColor: getCategoryColors(post.category, theme.isDark).bg }]}>
                                <Text style={[styles.categoryText, { color: getCategoryColors(post.category, theme.isDark).text }]}>
                                    {getCategoryLabel(post.category)}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.moreButton}>
                                <Ionicons name="ellipsis-horizontal" size={20} color="#111827" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Content Section */}
                    <Text style={[styles.title, { color: theme.text }]}>{post.title}</Text>

                    {!hideDescription && (
                        <Text style={[styles.preview, { color: theme.textSecondary }]} numberOfLines={4}>
                            {post.description}
                        </Text>
                    )}

                    {/* Comments Preview */}
                    {comments.length > 0 && (
                        <View style={[styles.commentsPreview, { backgroundColor: '#e8e8e8d1' }]}>
                            {comments.slice(0, 2).map((comment) => (
                                <View key={comment.id} style={styles.commentItem}>
                                    <Avatar seed={commentorProfiles[comment.commentorId] || "anonymous"} size={28} style={styles.commentAvatar} />
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

                    {/* Footer / Reactions */}
                    <View style={styles.footer}>
                        <View style={styles.reactions}>
                            <View style={styles.reactionPill}>
                                <Ionicons name="heart" size={16} color="#EB5757" />
                                <Text style={styles.reactionCount}>{likeCount}</Text>
                            </View>

                            <View style={styles.reactionPill}>
                                <Ionicons name="hand-left" size={16} color="#F2C94C" />
                                <Text style={styles.reactionCount}>{hugCount}</Text>
                            </View>

                            <View style={styles.reactionPill}>
                                <Ionicons name="happy" size={16} color="#27AE60" />
                                <Text style={styles.reactionCount}>{meTooCount}</Text>
                            </View>

                            <View style={styles.reactionPill}>
                                <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
                                <Text style={styles.reactionCount}>{commentCount}</Text>
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
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        marginBottom: 10,
        marginHorizontal: 8,
        // shadowColor: "#000",
        // shadowOffset: { width: 0, height: 4 },
        // shadowOpacity: 0.05,
        // shadowRadius: 10,
        elevation: 0.5,
        position: 'relative',
        overflow: 'hidden',
    },
    blobContainer: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        width: 150,
        height: 150,
        zIndex: 0,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    blobIcon: {
        opacity: 0.8,
    },
    otherBlobWrapper: {
        position: 'relative',
        width: '100%',
        height: '100%',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
    },
    otherBlobShape: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 200,
        height: 200,
        backgroundColor: '#E6E6FF',
        borderRadius: 100,
        borderTopLeftRadius: 150,
        borderBottomLeftRadius: 20,
        transform: [{ scaleX: 1.2 }],
    },
    otherBlobGhost: {
        position: 'absolute',
        bottom: 25,
        right: 25,
        opacity: 0.7,
    },
    card: {
        paddingVertical: 15,
        paddingHorizontal: 10,
        zIndex: 1, // Stay above blob
    },
    authorSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatarWrapperGhost: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarWrapper: {
        // Just holding the avatar
    },
    authorName: {
        fontSize: 15,
        fontWeight: "800",
        letterSpacing: -0.3,
    },
    timestamp: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    moreButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        marginBottom: 8,
        lineHeight: 28,
        letterSpacing: -0.5,
    },
    preview: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 20,
        fontWeight: '500',
    },
    commentsPreview: {
        borderRadius: 20,
        padding: 12,
        marginBottom: 20,
        gap: 12,
    },
    commentItem: {
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
        fontSize: 13,
        fontWeight: "800",
    },
    commentText: {
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '500',
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    reactions: {
        flexDirection: "row",
        gap: 10,
        flexWrap: 'wrap',
    },
    reactionPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
    },
    reactionCount: {
        fontSize: 13,
        fontWeight: "700",
        color: '#111827',
    },
});
