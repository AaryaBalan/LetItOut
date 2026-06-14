import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Loading from "../components/Loading";
import PostCard from "../components/PostCard";
import { db } from "../config/firebase";
import { useTheme } from "../context/ThemeContext";

export default function HelpNeeded() {
    const router = useRouter();
    const { theme } = useTheme();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch all posts with helpNeeded: true
    useEffect(() => {
        const postsQuery = query(
            collection(db, "posts"),
            where("helpNeeded", "==", true)
        );

        const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
            const fetchedPosts = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Sort by most recent
            fetchedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            setPosts(fetchedPosts);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <Ionicons
                    name="arrow-back"
                    size={24}
                    color={theme.text}
                    onPress={() => router.back()}
                    style={styles.backButton}
                />
                <View style={styles.headerContent}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Posts That Need Help</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                        {posts.length} {posts.length === 1 ? 'post' : 'posts'} need your support
                    </Text>
                </View>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <Loading size="large" color="#7C3AED" />
                    </View>
                ) : posts.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="heart-outline" size={64} color={theme.textSecondary} />
                        <Text style={[styles.emptyText, { color: theme.text }]}>
                            No posts need help right now
                        </Text>
                        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                            Check back later to support others
                        </Text>
                    </View>
                ) : (
                    <View style={styles.postsContainer}>
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: "400",
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 24,
        textAlign: "center",
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 8,
        textAlign: "center",
    },
    postsContainer: {
        padding: 16,
        gap: 16,
    },
});
