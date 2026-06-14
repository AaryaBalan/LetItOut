import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
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
import CommentThread from "../../components/CommentThread";
import Loading from "../../components/Loading";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
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
    return colors[category] || "#E5E7EB";
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
    const { theme } = useTheme();
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
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [showShareModal, setShowShareModal] = useState(false);
    const [friends, setFriends] = useState([]);
    const [sharing, setSharing] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); // Track which comment is being replied to


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

    // Handle Keyboard events with height tracking
    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            }
        );

        const hideSubscription = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => {
                setKeyboardHeight(0);
            }
        );

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    // Check if post is saved
    useEffect(() => {
        const checkSavedStatus = async () => {
            if (!user || !id) return;

            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const savedPosts = userDoc.data().savedPosts || [];
                    setIsSaved(savedPosts.includes(String(id)));
                }
            } catch (error) {
                console.error("Error checking saved status:", error);
            }
        };

        checkSavedStatus();
    }, [user, id]);

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
        if (!user || sharing || !post) return;

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

    // Helper function to calculate time ago
    const getTimeAgo = (timestamp) => {
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

        const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

        if (isNaN(postDate.getTime())) return "Just now";

        const now = new Date();
        const diffInMs = now - postDate;
        const diffInMinutes = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        const diffInWeeks = Math.floor(diffInDays / 7);
        const diffInMonths = Math.floor(diffInDays / 30);
        const diffInYears = Math.floor(diffInDays / 365);

        if (diffInMinutes < 1) return "Just now";
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        if (diffInDays < 30) return `${diffInWeeks}w ago`;
        if (diffInDays < 365) return `${diffInMonths}mon ago`;
        return `${diffInYears}yr ago`;
    };

    // Helper function to build comment tree from flat array
    const buildCommentTree = (flatComments) => {
        const commentMap = {};
        const rootComments = [];

        // First pass: create a map of all comments
        flatComments.forEach(comment => {
            commentMap[comment.id] = { ...comment, replies: [] };
        });

        // Second pass: build the tree structure
        flatComments.forEach(comment => {
            if (comment.parentId && commentMap[comment.parentId]) {
                // This is a reply, add it to parent's replies array
                commentMap[comment.parentId].replies.push(commentMap[comment.id]);
            } else {
                // This is a root comment
                rootComments.push(commentMap[comment.id]);
            }
        });

        return rootComments;
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.errorContainer, { backgroundColor: theme.background }]}>
                <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />
                <Loading size="large" color={theme.isDark ? '#B39DDB' : '#7C3AED'} style={{ marginBottom: 16 }} />
                <Text style={[styles.errorText, { color: theme.textSecondary }]}>Loading...</Text>
            </SafeAreaView>
        );
    }

    if (!post) {
        return (
            <SafeAreaView style={[styles.errorContainer, { backgroundColor: theme.background }]}>
                <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />
                <Text style={[styles.errorText, { color: theme.textSecondary }]}>Post not found</Text>
            </SafeAreaView>
        );
    }




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
                parentId: replyingTo ? replyingTo.id : null, // Add parentId for replies
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

            // Create notification for post author or parent comment author
            if (replyingTo && replyingTo.commentorId) {
                // Notify the parent comment author
                await createCommentNotification(
                    replyingTo.commentorId,
                    String(id),
                    post.title,
                    user.uid,
                    user.displayName || "Anonymous",
                    commentText,
                );
            } else if (post && post.authorId) {
                // Notify the post author
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
            setReplyingTo(null); // Clear reply state
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


    // Save/Unsave post
    const handleSavePost = async () => {
        if (!user) {
            Alert.alert("Not Logged In", "Please log in to save posts.");
            return;
        }

        if (saving) return;

        setSaving(true);
        try {
            const userRef = doc(db, "users", user.uid);

            if (isSaved) {
                // Unsave post
                await updateDoc(userRef, {
                    savedPosts: arrayRemove(String(id))
                });
                setIsSaved(false);
            } else {
                // Save post
                await updateDoc(userRef, {
                    savedPosts: arrayUnion(String(id))
                });
                setIsSaved(true);
            }
        } catch (error) {
            console.error("Error saving/unsaving post:", error);
            Alert.alert("Error", "Failed to save post. Please try again.");
        } finally {
            setSaving(false);
        }
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


    // Define Black Theme overrides for Dark Mode
    const blackTheme = {
        ...theme,
        background: "#000000",
        surface: "#000000",
        card: "#000000",
        input: "#000000",
        border: "#333333",
        text: "#FFFFFF",
        textSecondary: "#BDBDBD",
        textTertiary: "#6B7280",
        placeholder: "#6B7280",
        inputBorder: "#333333",
        statusBar: "light-content",
    };

    const activeTheme = theme.isDark ? blackTheme : theme;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: activeTheme.background }]} edges={["top"]}>
            <StatusBar
                barStyle={theme.isDark ? "light-content" : "dark-content"}
                backgroundColor={activeTheme.background}
            />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: activeTheme.background, borderBottomColor: activeTheme.border }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={28} color={activeTheme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: activeTheme.text }]}>Post Detail</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={handleSavePost}
                        disabled={saving}
                    >
                        <Ionicons
                            name={isSaved ? "bookmark" : "bookmark-outline"}
                            size={24}
                            color={isSaved ? "#FFB74D" : "#7C3AED"}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setShowShareModal(true)}
                    >
                        <Ionicons name="share-outline" size={24} color={activeTheme.textSecondary} />
                    </TouchableOpacity>
                    {isAuthor && (
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={handleDelete}
                        >
                            <Ionicons name="trash-outline" size={24} color="#EF5350" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={[styles.flex1, { paddingBottom: Platform.OS === "android" ? keyboardHeight : 0 }]}>
                <KeyboardAvoidingView
                    style={styles.flex1}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                >
                    <ScrollView
                        style={[styles.scrollView, { backgroundColor: activeTheme.background }]}
                        contentContainerStyle={[styles.scrollContent, { backgroundColor: activeTheme.background }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Post Card */}
                        <View style={[styles.postCard, { backgroundColor: activeTheme.card }]}>
                            <View style={styles.postHeader}>
                                <View
                                    style={[
                                        styles.categoryBadge,
                                        { backgroundColor: getCategoryColor(post.category) },
                                    ]}
                                >
                                    <Text style={[styles.categoryText, { color: "#111827" }]}>
                                        {getCategoryLabel(post.category)}
                                    </Text>
                                </View>
                                <Text style={[styles.timestamp, { color: activeTheme.textSecondary }]}>{post.timestamp}</Text>
                            </View>

                            {/* Author Section */}
                            <TouchableOpacity
                                style={styles.authorSection}
                                onPress={() => {
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
                                    <View style={[styles.avatarWrapper, { backgroundColor: activeTheme.border, borderRadius: 20 }]}>
                                        <Image
                                            source={require("../../assets/images/letitout_logo.png")}
                                            style={{ width: 40, height: 40, borderRadius: 20 }}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.avatarWrapper}>
                                        <Avatar seed={authorProfileCode} size={40} />
                                    </View>
                                )}
                                <Text style={[styles.authorName, { color: activeTheme.text }]}>
                                    {post.isAnonymous || !post.authorName
                                        ? "Anonymous"
                                        : post.authorName}
                                </Text>
                            </TouchableOpacity>

                            <Text style={[styles.postTitle, { color: activeTheme.text, fontWeight: '700' }]}>{post.title}</Text>
                            <Text style={[styles.postDescription, { color: activeTheme.textSecondary }]}>{post.description}</Text>

                            {/* Hugs Sent */}
                            <View style={styles.hugsSentContainer}>
                                <View style={[styles.hugIcon, { backgroundColor: activeTheme.surface, borderColor: activeTheme.border, borderWidth: 1 }]}>
                                    <Ionicons name="heart" size={16} color="#E57373" />
                                </View>
                                <View style={[styles.hugIcon, { backgroundColor: activeTheme.surface, borderColor: activeTheme.border, borderWidth: 1 }]}>
                                    <Ionicons name="hand-left" size={16} color="#FFB74D" />
                                </View>
                                <View style={[styles.hugIcon, { backgroundColor: activeTheme.surface, borderColor: activeTheme.border, borderWidth: 1 }]}>
                                    <Ionicons name="happy" size={16} color="#66BB6A" />
                                </View>
                                <Text style={[styles.hugsSentText, { color: activeTheme.textTertiary }]}>
                                    {likeCount + hugCount + meTooCount} reactions
                                </Text>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        likeActive && { backgroundColor: "#FFCDD2" }, // Red 100
                                        !likeActive && { backgroundColor: activeTheme.border }
                                    ]}
                                    onPress={handleLike}
                                >
                                    <Ionicons
                                        name={likeActive ? "heart" : "heart-outline"}
                                        size={18}
                                        color={likeActive ? "#C62828" : "#7C3AED"} // Red 800
                                    />
                                    <Text
                                        style={[
                                            styles.actionButtonText,
                                            likeActive && { color: "#C62828" }, // Red 800
                                            !likeActive && { color: activeTheme.textSecondary }
                                        ]}
                                    >
                                        Like {likeCount > 0 && `(${likeCount})`}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        hugActive && { backgroundColor: "#FFE0B2" }, // Orange 100
                                        !hugActive && { backgroundColor: activeTheme.border }
                                    ]}
                                    onPress={handleHug}
                                >
                                    <Ionicons
                                        name={hugActive ? "hand-left" : "hand-left-outline"}
                                        size={18}
                                        color={hugActive ? "#EF6C00" : "#7C3AED"} // Orange 800
                                        style={hugActive ? { textShadowColor: 'rgba(239, 108, 0, 0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5 } : {}}
                                    />
                                    <Text
                                        style={[
                                            styles.actionButtonText,
                                            hugActive && { color: "#EF6C00" }, // Orange 800
                                            !hugActive && { color: activeTheme.textSecondary }
                                        ]}
                                    >
                                        Send Hug {hugCount > 0 && `(${hugCount})`}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        meTooActive && { backgroundColor: "#C8E6C9" }, // Green 100
                                        !meTooActive && { backgroundColor: activeTheme.border }
                                    ]}
                                    onPress={handleMeToo}
                                >
                                    <Ionicons
                                        name={meTooActive ? "happy" : "happy-outline"}
                                        size={18}
                                        color={meTooActive ? "#2E7D32" : "#7C3AED"} // Green 800
                                    />
                                    <Text
                                        style={[
                                            styles.actionButtonText,
                                            meTooActive && { color: "#2E7D32" }, // Green 800
                                            !meTooActive && { color: activeTheme.textSecondary }
                                        ]}
                                    >
                                        Me too {meTooCount > 0 && `(${meTooCount})`}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Supportive Replies Section */}
                        <View style={[styles.repliesSection, { backgroundColor: activeTheme.background, borderTopColor: activeTheme.border }]}>
                            <View style={[styles.repliesHeader, { borderBottomColor: activeTheme.border }]}>
                                <Text style={[styles.repliesTitle, { color: activeTheme.text }]}>Supportive Replies</Text>
                                <Text style={[styles.repliesCountText, { color: activeTheme.textSecondary }]}>
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
                                <View style={[styles.commentsContainer, { backgroundColor: activeTheme.background }]}>
                                    {/* Vertical line connecting all comments */}
                                    <View style={[styles.commentsVerticalLine, { backgroundColor: '#7C3AED' }]} />

                                    {buildCommentTree(comments).map((comment, index) => (
                                        <CommentThread
                                            key={comment.id || index}
                                            comment={comment}
                                            depth={0}
                                            maxDepth={3}
                                            onReply={(comment) => setReplyingTo(comment)}
                                            onSupport={handleCommentSupport}
                                            commentSupports={commentSupports}
                                            userCommentSupports={userCommentSupports}
                                            commentorProfiles={commentorProfiles}
                                            themeOverride={activeTheme}
                                        />
                                    ))}
                                </View>
                            ) : (
                                <View style={[styles.noCommentsContainer, { backgroundColor: activeTheme.background }]}>
                                    <Text style={[styles.noCommentsText, { color: activeTheme.textSecondary }]}>
                                        No comments yet. Be the first to share support!
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Report Button */}
                        <TouchableOpacity
                            onPress={handleReport}
                            style={[styles.reportButton, { backgroundColor: activeTheme.background }]}
                        >
                            <Ionicons name="flag-outline" size={16} color={activeTheme.textTertiary} />
                            <Text style={[styles.reportText, { color: activeTheme.textTertiary }]}>REPORT CONTENT</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Reply Indicator */}
                    {replyingTo && (
                        <View style={[styles.replyIndicator, { backgroundColor: activeTheme.surface, borderTopColor: activeTheme.border }]}>
                            <View style={styles.replyIndicatorContent}>
                                <Ionicons name="arrow-undo" size={16} color="#7C3AED" />
                                <Text style={[styles.replyingToText, { color: activeTheme.textSecondary }]}>
                                    Replying to <Text style={{ color: '#7C3AED', fontWeight: '600' }}>@{replyingTo.username || 'Anonymous'}</Text>
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Ionicons name="close-circle" size={20} color={activeTheme.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Bottom Input */}
                    <View style={[styles.bottomInput, { backgroundColor: activeTheme.background, borderTopColor: activeTheme.border }]}>
                        <TextInput
                            style={[styles.input, { backgroundColor: activeTheme.surface, color: activeTheme.text, borderColor: activeTheme.border }]}
                            placeholder="Type a message of support..."
                            placeholderTextColor={activeTheme.textTertiary}
                            value={newComment}
                            onChangeText={setNewComment}
                        />
                        <TouchableOpacity style={styles.emojiButton}>
                            <Ionicons name="happy-outline" size={24} color={activeTheme.textSecondary} />
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
            </View>

            {/* Share Modal */}
            <Modal
                visible={showShareModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowShareModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowShareModal(false)}
                >
                    <Pressable style={[styles.modalContent, { backgroundColor: activeTheme.surface }]} onPress={(e) => e.stopPropagation()}>
                        <View style={[styles.modalHeader, { borderBottomColor: activeTheme.border }]}>
                            <Text style={[styles.modalTitle, { color: activeTheme.text }]}>Share with Friends</Text>
                            <TouchableOpacity onPress={() => setShowShareModal(false)}>
                                <Ionicons name="close" size={24} color={activeTheme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {friends.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={48} color={activeTheme.textTertiary} />
                                <Text style={[styles.emptyText, { color: activeTheme.textSecondary }]}>No friends to share with</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={friends}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.friendItem, { borderBottomColor: activeTheme.border }]}
                                        onPress={() => handleShare(item.id)}
                                        disabled={sharing}
                                    >
                                        {item.profileCode ? (
                                            <Avatar seed={item.profileCode} size={40} />
                                        ) : (
                                            <View style={[styles.defaultAvatar, { backgroundColor: theme.isDark ? '#333333' : '#F3E5F5' }]}>
                                                <Ionicons name="person" size={20} color="#7C3AED" />
                                            </View>
                                        )}
                                        <Text style={[styles.friendName, { color: activeTheme.text }]}>{item.name}</Text>
                                        <Ionicons name="share-outline" size={20} color="#9F8BFF" />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex1: {
        flex: 1,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        fontSize: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
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
        letterSpacing: 0.5,
    },
    timestamp: {
        fontSize: 13,
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
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: "600",
    },
    authorName: {
        fontSize: 15,
        fontWeight: "600",
    },
    postTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 12,
        lineHeight: 28,
    },
    postDescription: {
        fontSize: 15,
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
        justifyContent: "center",
        alignItems: "center",
        marginRight: -8,
        borderWidth: 2,
    },
    hugsSentText: {
        fontSize: 14,
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
        gap: 6,
    },
    actionButtonActive: {
        backgroundColor: "#4A148C",
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: "600",
    },
    actionButtonTextActive: {
        color: "#E1BEE7",
    },
    repliesSection: {
        padding: 20,
        marginTop: 0,
        borderTopWidth: 1,
    },
    repliesHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    repliesTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    repliesCountText: {
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    commentsContainer: {
        position: 'relative',
        gap: 16,
        paddingLeft: 16, // Reduced from 27 to move tree left
    },
    commentsVerticalLine: {
        position: 'absolute',
        left: 0.5, // Moved to start from near edge
        top: 0,
        bottom: 0,
        width: 1.5,
        zIndex: 0,
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
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerButton: {
        padding: 4,
    },
    commentUsername: {
        fontSize: 14,
        fontWeight: "600",
        color: "#7C3AED",
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
        marginTop: 8,
    },
    supportButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    supportText: {
        fontSize: 13,
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
    replyIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
    },
    replyIndicatorContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    replyingToText: {
        fontSize: 14,
    },
    bottomInput: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#333333",
    },
    input: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 16,
        fontSize: 14,
        marginRight: 10,
        borderWidth: 1,
        borderColor: "#333333",
    },
    emojiButton: {
        padding: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#7C3AED",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "flex-end",
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#333333",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    emptyState: {
        padding: 40,
        alignItems: "center",
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        color: "#BDBDBD",
        textAlign: "center",
    },
    friendItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#333333",
        gap: 12,
    },
    defaultAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#333333",
        justifyContent: "center",
        alignItems: "center",
    },
    friendName: {
        flex: 1,
        fontSize: 16,
        fontWeight: "500",
        color: "#FFFFFF",
    },
});
