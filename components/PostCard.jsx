import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../config/firebase";
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

export default function PostCard({ post }) {
    const [likeCount, setLikeCount] = useState(0);
    const [hugCount, setHugCount] = useState(0);
    const [meTooCount, setMeTooCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [authorProfileCode, setAuthorProfileCode] = useState(null);

    // Fetch author profile code
    useEffect(() => {
        const fetchAuthorProfile = async () => {
            if (!post.authorId || post.isAnonymous) {
                setAuthorProfileCode(null);
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, "users", post.authorId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setAuthorProfileCode(
                        userData.profileCode || userData.email || null,
                    );
                }
            } catch (error) {
                console.error("Error fetching author profile:", error);
            }
        };

        fetchAuthorProfile();
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

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCommentCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [post.id]);

    return (
        <Link href={`/post/${post.id}`} asChild>
            <TouchableOpacity style={styles.card}>
                <View style={styles.cardHeader}>
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
                            <Ionicons name="person" size={16} color="#9575cd" />
                        </View>
                    ) : (
                        <View style={styles.avatarWrapper}>
                            <Avatar seed={authorProfileCode} size={32} />
                        </View>
                    )}
                    <Text style={styles.authorName}>
                        {post.isAnonymous || !post.authorName
                            ? "Anonymous"
                            : post.authorName}
                    </Text>
                </View>

                <Text style={styles.title}>{post.title}</Text>

                <Text style={styles.preview} numberOfLines={3}>
                    {post.description}
                </Text>

                <View style={styles.footer}>
                    <View style={styles.reactions}>
                        <View style={styles.reactionButton}>
                            <Ionicons name="heart" size={20} color="#E57373" />
                            <Text style={styles.reactionCount}>{likeCount}</Text>
                        </View>

                        <View style={styles.reactionButton}>
                            <Ionicons name="hand-left" size={20} color="#FFB74D" />
                            <Text style={styles.reactionCount}>{hugCount}</Text>
                        </View>

                        <View style={styles.reactionButton}>
                            <Ionicons name="happy" size={20} color="#66BB6A" />
                            <Text style={styles.reactionCount}>{meTooCount}</Text>
                        </View>
                    </View>

                    <View style={styles.commentSection}>
                        <Ionicons
                            name="chatbubble-outline"
                            size={18}
                            color="#9E9E9E"
                        />
                        <Text style={styles.commentCount}>{commentCount}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
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
        marginBottom: 12,
    },
    avatarWrapper: {
        marginRight: 8,
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#EFE8FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#9575cd",
    },
    authorName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#9575cd",
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
        color: "#212121",
        marginBottom: 8,
        lineHeight: 24,
    },
    preview: {
        fontSize: 14,
        color: "#757575",
        lineHeight: 22,
        marginBottom: 16,
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
        fontSize: 14,
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
        fontSize: 14,
        fontWeight: "600",
        color: "#757575",
    },
});
