import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    increment,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/Avatar";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { getPostById } from "../../data/dummyData";
import {
    createCommentNotification,
    createHugNotification,
    createLikeNotification,
    createMeTooNotification,
} from "../../utils/notifications";

const getCategoryColor = (category) => {
    const colors = {
        Study: "#E1BEE7",
        "Mental Health": "#B39DDB",
        Mindfulness: "#FFE082",
        Stress: "#FFAB91",
        Anxiety: "#B39DDB",
        Relationship: "#F48FB1",
        Family: "#80CBC4",
    };
    return colors[category] || "#E0E0E0";
};

const getCategoryLabel = (category) => {
    const labels = {
        Study: "ACADEMIC STRESS",
    };
    return labels[category] || category.toUpperCase();
};

export default function PostDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthor, setIsAuthor] = useState(false);

    const [hugCount, setHugCount] = useState(0);
    const [meTooCount, setMeTooCount] = useState(0);
    const [likeCount, setLikeCount] = useState(0);
    const [hugActive, setHugActive] = useState(false);
    const [meTooActive, setMeTooActive] = useState(false);
    const [likeActive, setLikeActive] = useState(false);
    const [userReactions, setUserReactions] = useState({}); // Store user's reaction doc IDs by type
    const [newComment, setNewComment] = useState("");
    const [comments, setComments] = useState([]);
    const [commentSupports, setCommentSupports] = useState({}); // Store support counts per comment
    const [userCommentSupports, setUserCommentSupports] = useState({}); // Store user's support status per comment
    const [authorProfileCode, setAuthorProfileCode] = useState(null);
    const [commentorProfiles, setCommentorProfiles] = useState({}); // Store profile codes for commentors

    // Fetch post from Firebase or dummy data
    useEffect(() => {
        const fetchPost = async () => {
            try {
                // First, try to fetch from Firebase
                const docRef = doc(db, "posts", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const fetchedPost = {
                        id: docSnap.id,
                        title: data.title,
                        description: data.description,
                        category: data.category,
                        timestamp: data.createdAt
                            ? getTimeAgo(data.createdAt)
                            : "Just now",
                        reactions: data.reactions || { support: 0, hug: 0 },
                        commentCount: data.commentCount || 0,
                        comments: data.comments || [],
                        isAnonymous: data.isAnonymous,
                        authorName: data.authorName || "Anonymous",
                        authorId: data.authorId,
                    };
                    setPost(fetchedPost);
                    // Reactions are fetched separately in real-time

                    // Check if current user is the author
                    if (user && data.authorId === user.uid) {
                        setIsAuthor(true);
                    }

                    // Fetch author profile code
                    if (data.authorId && !data.isAnonymous) {
                        const userDoc = await getDoc(doc(db, "users", data.authorId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            setAuthorProfileCode(
                                userData.profileCode || userData.email || null,
                            );
                        }
                    } else {
                        setAuthorProfileCode(null);
                    }
                } else {
                    // Fallback to dummy data
                    const dummyPost = getPostById(id);
                    if (dummyPost) {
                        setPost(dummyPost);
                        // For dummy posts, we can use their embedded comments
                        setComments(dummyPost.comments || []);
                    }
                }
            } catch (error) {
                console.error("Error fetching post:", error);
                // Fallback to dummy data on error
                const dummyPost = getPostById(id);
                if (dummyPost) {
                    setPost(dummyPost);
                    // For dummy posts, we can use their embedded comments
                    setComments(dummyPost.comments || []);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [id, user]);

    // Fetch comments for this post in real-time
    useEffect(() => {
        if (!id) {
            return;
        }

        console.log("Fetching comments for postId:", id, "Type:", typeof id);

        const commentsRef = collection(db, "comments");
        const q = query(commentsRef, where("postId", "==", String(id)));

        const unsubscribe = onSnapshot(
            q,
            async (snapshot) => {
                console.log("Comments snapshot size:", snapshot.size);
                const fetchedComments = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    console.log("Comment data:", {
                        postId: data.postId,
                        comment: data.comment,
                    });
                    return {
                        id: doc.id,
                        text: data.comment,
                        username: data.commentorName || "Anonymous",
                        timestamp: data.createdAt
                            ? getTimeAgo(data.createdAt)
                            : "Just now",
                        commentorId: data.commentorId,
                        createdAt: data.createdAt,
                        reactionCount: data.reactionCount || 0,
                    };
                });
                // Sort by createdAt on client side
                fetchedComments.sort((a, b) => {
                    if (!a.createdAt) return 1;
                    if (!b.createdAt) return -1;
                    return new Date(a.createdAt) - new Date(b.createdAt);
                });
                console.log("Total comments fetched:", fetchedComments.length);
                setComments(fetchedComments);

                // Fetch profile codes for all commentors
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
            },
            (error) => {
                console.error("Error fetching comments:", error);
                setComments([]);
            },
        );

        return () => {
            console.log("Cleaning up comments listener for postId:", id);
            unsubscribe();
        };
    }, [id]);

    // Fetch reactions for this post in real-time
    useEffect(() => {
        if (!id) return;

        const reactionsRef = collection(db, "reactions");
        const q = query(reactionsRef, where("postId", "==", String(id)));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Count reactions by type
            const counts = { hug: 0, metoo: 0, like: 0 };
            const userReactionDocs = {};

            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                const type = data.type;

                // Count all reactions
                if (type === "hug") counts.hug++;
                else if (type === "metoo") counts.metoo++;
                else if (type === "like") counts.like++;

                // Track user's own reactions
                if (user && data.userId === user.uid) {
                    userReactionDocs[type] = docSnap.id;
                }
            });

            setHugCount(counts.hug);
            setMeTooCount(counts.metoo);
            setLikeCount(counts.like);

            // Update active states based on user's reactions
            setHugActive(!!userReactionDocs.hug);
            setMeTooActive(!!userReactionDocs.metoo);
            setLikeActive(!!userReactionDocs.like);

            setUserReactions(userReactionDocs);
        });

        return () => unsubscribe();
    }, [id, user]);

    // Fetch comment supports in real-time
    useEffect(() => {
        if (!id || comments.length === 0) return;

        const commentSupportsRef = collection(db, "commentSupports");
        const commentIds = comments.map(c => c.id);

        if (commentIds.length === 0) return;

        const q = query(commentSupportsRef, where("commentId", "in", commentIds));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const supportCounts = {};
                const userSupports = {};

                snapshot.docs.forEach((docSnap) => {
                    const data = docSnap.data();
                    const commentId = data.commentId;

                    // Count supports per comment
                    if (!supportCounts[commentId]) {
                        supportCounts[commentId] = 0;
                    }
                    supportCounts[commentId]++;

                    // Track user's own supports
                    if (user && data.userId === user.uid) {
                        userSupports[commentId] = docSnap.id;
                    }
                });

                setCommentSupports(supportCounts);
                setUserCommentSupports(userSupports);
            },
            (error) => {
                console.log("Comment supports fetch error (permission denied - will use default counts):", error.code);
                // Initialize with zero counts if we don't have permission
                setCommentSupports({});
                setUserCommentSupports({});
            }
        );

        return () => unsubscribe();
    }, [id, comments, user]);

    // Helper function to calculate time ago
    const getTimeAgo = (timestamp) => {
        const now = new Date();
        const postDate = new Date(timestamp);
        const diffInMs = now - postDate;
        const diffInMinutes = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return "Just now";
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        return `${diffInDays}d ago`;
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <ActivityIndicator size="large" color="#B39DDB" style={{ marginBottom: 16 }} />
                <Text style={styles.errorText}>Loading...</Text>
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <Text style={styles.errorText}>Post not found</Text>
            </SafeAreaView>
        );
    }

    const handleSupport = () => {
        setSupportActive(!supportActive);
        setSupportCount(supportActive ? supportCount - 1 : supportCount + 1);
    };

    const handleHug = async () => {
        if (!user) {
            Alert.alert("Not Logged In", "Please log in to react.");
            return;
        }

        try {
            if (hugActive && userReactions.hug) {
                // Remove reaction
                await deleteDoc(doc(db, "reactions", userReactions.hug));
                // Decrement reactionCount
                await updateDoc(doc(db, "posts", String(id)), {
                    reactionCount: increment(-1),
                });
                // Decrement user's loveSent count
                await updateDoc(doc(db, "users", user.uid), {
                    loveSent: increment(-1),
                });
            } else {
                // Add reaction
                await addDoc(collection(db, "reactions"), {
                    postId: String(id),
                    userId: user.uid,
                    userName: user.displayName || "Anonymous",
                    type: "hug",
                    timestamp: serverTimestamp(),
                    createdAt: new Date().toISOString(),
                });
                // Increment reactionCount
                await updateDoc(doc(db, "posts", String(id)), {
                    reactionCount: increment(1),
                });
                // Increment user's loveSent count
                await updateDoc(doc(db, "users", user.uid), {
                    loveSent: increment(1),
                });

                // Create notification for post author
                if (post && post.authorId) {
                    await createHugNotification(
                        post.authorId,
                        String(id),
                        post.title,
                        user.uid,
                        user.displayName || "Anonymous",
                    );
                }
            }
        } catch (error) {
            console.error("Error toggling hug reaction:", error);
            Alert.alert("Error", "Failed to update reaction. Please try again.");
        }
    };

    const handleMeToo = async () => {
        if (!user) {
            Alert.alert("Not Logged In", "Please log in to react.");
            return;
        }

        try {
            if (meTooActive && userReactions.metoo) {
                // Remove reaction
                await deleteDoc(doc(db, "reactions", userReactions.metoo));
                // Decrement reactionCount
                await updateDoc(doc(db, "posts", String(id)), {
                    reactionCount: increment(-1),
                });
                // Decrement user's loveSent count
                await updateDoc(doc(db, "users", user.uid), {
                    loveSent: increment(-1),
                });
            } else {
                // Add reaction
                await addDoc(collection(db, "reactions"), {
                    postId: String(id),
                    userId: user.uid,
                    userName: user.displayName || "Anonymous",
                    type: "metoo",
                    timestamp: serverTimestamp(),
                    createdAt: new Date().toISOString(),
                });
                // Increment reactionCount
                await updateDoc(doc(db, "posts", String(id)), {
                    reactionCount: increment(1),
                });
                // Increment user's loveSent count
                await updateDoc(doc(db, "users", user.uid), {
                    loveSent: increment(1),
                });

                // Create notification for post author
                if (post && post.authorId) {
                    await createMeTooNotification(
                        post.authorId,
                        String(id),
                        post.title,
                        user.uid,
                        user.displayName || "Anonymous",
                    );
                }
            }
        } catch (error) {
            console.error("Error toggling me too reaction:", error);
            Alert.alert("Error", "Failed to update reaction. Please try again.");
        }
    };

    const handleLike = async () => {
        if (!user) {
            Alert.alert("Not Logged In", "Please log in to react.");
            return;
        }

        try {
            if (likeActive && userReactions.like) {
                // Remove reaction
                await deleteDoc(doc(db, "reactions", userReactions.like));
                // Decrement reactionCount
                await updateDoc(doc(db, "posts", String(id)), {
                    reactionCount: increment(-1),
                });
                // Decrement user's loveSent count
                await updateDoc(doc(db, "users", user.uid), {
                    loveSent: increment(-1),
                });
            } else {
                // Add reaction
                await addDoc(collection(db, "reactions"), {
                    postId: String(id),
                    userId: user.uid,
                    userName: user.displayName || "Anonymous",
                    type: "like",
                    timestamp: serverTimestamp(),
                    createdAt: new Date().toISOString(),
                });
                // Increment reactionCount
                await updateDoc(doc(db, "posts", String(id)), {
                    reactionCount: increment(1),
                });
                // Increment user's loveSent count
                await updateDoc(doc(db, "users", user.uid), {
                    loveSent: increment(1),
                });

                // Create notification for post author
                if (post && post.authorId) {
                    await createLikeNotification(
                        post.authorId,
                        String(id),
                        post.title,
                        user.uid,
                        user.displayName || "Anonymous",
                    );
                }
            }
        } catch (error) {
            console.error("Error toggling like reaction:", error);
            Alert.alert("Error", "Failed to update reaction. Please try again.");
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        if (!user) {
            Alert.alert("Not Logged In", "Please log in to comment.");
            return;
        }

        try {
            console.log("Creating comment for postId:", id, "Type:", typeof id);
            const commentText = newComment.trim();

            // Create comment in Firebase
            const commentData = {
                postId: String(id),
                commentorId: user.uid,
                commentorName: user.displayName || "Anonymous",
                comment: commentText,
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString(),
                reactionCount: 0,
            };
            console.log("Comment data to save:", commentData);

            await addDoc(collection(db, "comments"), commentData);

            // Increment reactionCount (comments count towards total)
            await updateDoc(doc(db, "posts", String(id)), {
                reactionCount: increment(1),
            });

            // Increment user's loveSent count
            await updateDoc(doc(db, "users", user.uid), {
                loveSent: increment(1),
            });

            // Create notification for post author
            if (post && post.authorId) {
                await createCommentNotification(
                    post.authorId,
                    String(id),
                    post.title,
                    user.uid,
                    user.displayName || "Anonymous",
                    commentText,
                );
            }

            setNewComment("");
            console.log("Comment added successfully");
        } catch (error) {
            console.error("Error adding comment:", error);
            Alert.alert("Error", "Failed to add comment. Please try again.");
        }
    };

    const handleCommentSupport = async (commentId) => {
        if (!user) {
            Alert.alert("Not Logged In", "Please log in to support comments.");
            return;
        }

        try {
            const commentSupportsRef = collection(db, "commentSupports");
            const commentDocRef = doc(db, "comments", commentId);
            const isSupported = !!userCommentSupports[commentId];

            if (isSupported) {
                // Remove support
                await deleteDoc(doc(db, "commentSupports", userCommentSupports[commentId]));
                // Decrement reactionCount
                await updateDoc(commentDocRef, {
                    reactionCount: increment(-1),
                });
            } else {
                // Add support
                await addDoc(commentSupportsRef, {
                    commentId: commentId,
                    userId: user.uid,
                    userName: user.displayName || "Anonymous",
                    timestamp: serverTimestamp(),
                    createdAt: new Date().toISOString(),
                });
                // Increment reactionCount
                await updateDoc(commentDocRef, {
                    reactionCount: increment(1),
                });
            }
        } catch (error) {
            console.error("Error toggling comment support:", error);
            Alert.alert("Error", "Failed to update support. Please try again.");
        }
    };

    const handleReport = () => {
        Alert.alert(
            "Report Content",
            "Thank you for helping keep our community safe.",
            [{ text: "OK" }],
        );
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, "posts", id));
                            Alert.alert("Success", "Post deleted successfully");
                            router.back();
                        } catch (error) {
                            console.error("Error deleting post:", error);
                            Alert.alert(
                                "Error",
                                "Failed to delete post. Please try again.",
                            );
                        }
                    },
                },
            ],
        );
    };

    const totalHugs = hugCount + meTooCount + likeCount;

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={28} color="#212121" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Post Detail</Text>
                {isAuthor ? (
                    <TouchableOpacity
                        style={styles.moreButton}
                        onPress={handleDelete}
                    >
                        <Ionicons name="trash-outline" size={24} color="#EF5350" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.moreButton}>
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={24}
                            color="#212121"
                        />
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                style={styles.flex1}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Post Card */}
                    <View style={styles.postCard}>
                        <View style={styles.postHeader}>
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
                            <Text style={styles.timestamp}>{post.timestamp}</Text>
                        </View>

                        {/* Author Section */}
                        <View style={styles.authorSection}>
                            {post.isAnonymous ||
                                !post.authorName ||
                                post.authorName === "Anonymous" ||
                                !authorProfileCode ? (
                                <View style={styles.avatarContainer}>
                                    <Ionicons name="person" size={18} color="#9575cd" />
                                </View>
                            ) : (
                                <View style={styles.avatarWrapper}>
                                    <Avatar seed={authorProfileCode} size={40} />
                                </View>
                            )}
                            <Text style={styles.authorName}>
                                {post.isAnonymous || !post.authorName
                                    ? "Anonymous"
                                    : post.authorName}
                            </Text>
                        </View>

                        <Text style={styles.postTitle}>{post.title}</Text>
                        <Text style={styles.postDescription}>{post.description}</Text>

                        {/* Hugs Sent */}
                        <View style={styles.hugsSentContainer}>
                            <View style={styles.hugIcon}>
                                <Ionicons name="heart" size={16} color="#E57373" />
                            </View>
                            <View style={styles.hugIcon}>
                                <Ionicons name="hand-left" size={16} color="#FFB74D" />
                            </View>
                            <View style={styles.hugIcon}>
                                <Ionicons name="happy" size={16} color="#66BB6A" />
                            </View>
                            <Text style={styles.hugsSentText}>
                                {likeCount + hugCount + meTooCount} reactions
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    likeActive && styles.actionButtonActive,
                                ]}
                                onPress={handleLike}
                            >
                                <Ionicons
                                    name="heart"
                                    size={18}
                                    color={likeActive ? "#E57373" : "#9575cd"}
                                />
                                <Text
                                    style={[
                                        styles.actionButtonText,
                                        likeActive && styles.actionButtonTextActive,
                                    ]}
                                >
                                    Like {likeCount > 0 && `(${likeCount})`}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    hugActive && styles.actionButtonActive,
                                ]}
                                onPress={handleHug}
                            >
                                <Ionicons
                                    name="hand-left"
                                    size={18}
                                    color={hugActive ? "#FFB74D" : "#9575cd"}
                                />
                                <Text
                                    style={[
                                        styles.actionButtonText,
                                        hugActive && styles.actionButtonTextActive,
                                    ]}
                                >
                                    Send Hug {hugCount > 0 && `(${hugCount})`}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    meTooActive && styles.actionButtonActive,
                                ]}
                                onPress={handleMeToo}
                            >
                                <Ionicons
                                    name="happy"
                                    size={18}
                                    color={meTooActive ? "#66BB6A" : "#9575cd"}
                                />
                                <Text
                                    style={[
                                        styles.actionButtonText,
                                        meTooActive && styles.actionButtonTextActive,
                                    ]}
                                >
                                    Me too {meTooCount > 0 && `(${meTooCount})`}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Supportive Replies Section */}
                    <View style={styles.repliesSection}>
                        <View style={styles.repliesHeader}>
                            <Text style={styles.repliesTitle}>Supportive Replies</Text>
                            <Text style={styles.repliesCountText}>
                                {comments.length} REPLIES
                            </Text>
                        </View>

                        {/* Comments List */}
                        {console.log(
                            "Rendering comments, count:",
                            comments.length,
                            "Data:",
                            JSON.stringify(comments),
                        )}
                        {comments.length > 0 ? (
                            <View style={styles.commentsContainer}>
                                {comments.map((comment, index) => (
                                    <View
                                        key={comment.id || index}
                                        style={styles.commentItem}
                                    >
                                        <View style={styles.commentCard}>
                                            <View style={styles.commentHeaderSection}>
                                                {comment.commentorId && commentorProfiles[comment.commentorId] ? (
                                                    <Avatar seed={commentorProfiles[comment.commentorId]} size={35} />
                                                ) : (
                                                    <View style={styles.commentAvatarPlaceholder}>
                                                        <Ionicons name="person" size={16} color="#9575cd" />
                                                    </View>
                                                )}
                                                <View style={styles.commentHeaderContent}>
                                                    <View style={styles.commentHeader}>
                                                        <Text style={styles.commentUsername}>
                                                            {comment.username || `KindSoul_${index + 1}`}
                                                        </Text>
                                                        <Text style={styles.commentTimestamp}>
                                                            {comment.timestamp}
                                                        </Text>
                                                    </View>

                                                    <Text style={styles.commentText}>
                                                        {comment.text}
                                                    </Text>

                                                    <View style={styles.commentActions}>
                                                        <TouchableOpacity
                                                            style={styles.supportButton}
                                                            onPress={() => handleCommentSupport(comment.id)}
                                                        >
                                                            <Ionicons
                                                                name={userCommentSupports[comment.id] ? "heart" : "heart-outline"}
                                                                size={16}
                                                                color="#66BB6A"
                                                            />
                                                            <Text style={styles.supportText}>
                                                                {commentSupports[comment.id] || 0} SUPPORT
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={styles.noCommentsContainer}>
                                <Text style={styles.noCommentsText}>
                                    No comments yet. Be the first to share support!
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Report Button */}
                    <TouchableOpacity
                        onPress={handleReport}
                        style={styles.reportButton}
                    >
                        <Ionicons name="flag-outline" size={16} color="#9E9E9E" />
                        <Text style={styles.reportText}>REPORT CONTENT</Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* Bottom Input */}
                <View style={styles.bottomInput}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message of support..."
                        placeholderTextColor="#BDBDBD"
                        value={newComment}
                        onChangeText={setNewComment}
                    />
                    <TouchableOpacity style={styles.emojiButton}>
                        <Ionicons name="happy-outline" size={24} color="#9E9E9E" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.sendButton}
                        onPress={handleAddComment}
                        disabled={!newComment.trim()}
                    >
                        <Ionicons
                            name="send"
                            size={20}
                            color={newComment.trim() ? "#FFFFFF" : "#BDBDBD"}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    flex1: {
        flex: 1,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
    },
    errorText: {
        fontSize: 16,
        color: "#757575",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "flex-start",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#212121",
    },
    moreButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "flex-end",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    postCard: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        marginBottom: 16,
    },
    postHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    categoryText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#212121",
        letterSpacing: 0.5,
    },
    timestamp: {
        fontSize: 13,
        color: "#BDBDBD",
    },
    authorSection: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    avatarWrapper: {
        marginRight: 10,
    },
    avatarContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#EFE8FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#9575cd",
    },
    authorName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#9575cd",
    },
    postTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#212121",
        marginBottom: 12,
        lineHeight: 28,
    },
    postDescription: {
        fontSize: 15,
        color: "#616161",
        lineHeight: 24,
        marginBottom: 20,
    },
    hugsSentContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    hugIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F5F5F5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: -8,
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    hugsSentText: {
        fontSize: 14,
        color: "#757575",
        marginLeft: 16,
    },
    actionButtons: {
        flexDirection: "row",
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: "#F3E5F5",
        gap: 6,
    },
    actionButtonActive: {
        backgroundColor: "#E1BEE7",
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#9575cd",
    },
    actionButtonTextActive: {
        color: "#6A1B9A",
    },
    repliesSection: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        marginBottom: 16,
    },
    repliesHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    repliesTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#212121",
    },
    repliesCountText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#9CA3AF",
        letterSpacing: 0.5,
    },
    commentsContainer: {
        gap: 16,
    },
    commentItem: {
        paddingLeft: 0,
    },
    commentCard: {
        backgroundColor: "#F8F9FA",
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: "#E8E4F3",
    },
    commentHeaderSection: {
        flexDirection: "row",
        gap: 12,
    },
    commentAvatarPlaceholder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#E8E4F3",
        justifyContent: "center",
        alignItems: "center",
    },
    commentHeaderContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    commentUsername: {
        fontSize: 14,
        fontWeight: "600",
        color: "#9575cd",
    },
    commentTimestamp: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    commentText: {
        fontSize: 14,
        color: "#374151",
        lineHeight: 20,
        marginBottom: 12,
    },
    commentActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    supportButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    supportText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#66BB6A",
        letterSpacing: 0.5,
    },
    noCommentsContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    noCommentsText: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
        fontStyle: "italic",
    },
    reportButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        gap: 8,
    },
    reportText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#9E9E9E",
        letterSpacing: 0.5,
    },
    bottomInput: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: "#F5F5F5",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: "#212121",
    },
    emojiButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#9575cd",
        justifyContent: "center",
        alignItems: "center",
    },
});
