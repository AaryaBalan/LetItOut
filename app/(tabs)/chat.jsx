import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/Avatar";
import Loading from "../../components/Loading";
import TabScreenWrapper from "../../components/TabScreenWrapper";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTabBar } from "../../context/TabBarContext";
import { useTheme } from "../../context/ThemeContext";

export default function ChatTab() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const { showTabBar } = useTabBar();
    const router = useRouter();

    // Ensure tab bar is shown when entering the Chat screen
    useEffect(() => {
        showTabBar();
    }, [showTabBar]);

    const [friends, setFriends] = useState([]);
    const [chats, setChats] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch Chats Metadata Real-time
    useEffect(() => {
        if (!user) return;

        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("participants", "array-contains", user.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatData = {};
            snapshot.docs.forEach(doc => {
                chatData[doc.id] = doc.data();
            });
            setChats(chatData);
        });

        return () => unsubscribe();
    }, [user]);

    const fetchFriends = useCallback(async () => {
        if (!user) return;
        try {
            // 1. Get people following the current user (Accepted)
            const followersQuery = query(
                collection(db, "friends"),
                where("followingId", "==", user.uid),
                where("status", "==", 1)
            );

            // 2. Get people the current user is following (Accepted)
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
            const friendsData = [];
            for (const friendId of ids) {
                if (friendId === user.uid) continue;

                const userDoc = await getDoc(doc(db, "users", friendId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    friendsData.push({
                        id: friendId,
                        name: userData.displayName || "Anonymous",
                        username: userData.username,
                        email: userData.email,
                        profileCode: userData.profileCode || userData.email || null,
                    });
                }
            }

            setFriends(friendsData);
        } catch (error) {
            console.error("Error fetching friends:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchFriends();
    };

    // Merge Friends with Chat Data
    const getProcessedFriends = () => {
        if (!user) return [];

        return friends.map(friend => {
            const chatId = [user.uid, friend.id].sort().join('_');
            const chat = chats[chatId];
            return {
                ...friend,
                chatId,
                lastMessage: chat?.lastMessage,
                lastMessageTimestamp: chat?.lastMessageTimestamp?.toDate ? chat.lastMessageTimestamp.toDate() : null,
                unreadCount: chat?.[`unreadCount_${user.uid}`] || 0
            };
        }).sort((a, b) => {
            // Sort by last message timestamp (recent first)
            if (a.lastMessageTimestamp && b.lastMessageTimestamp) {
                return b.lastMessageTimestamp - a.lastMessageTimestamp;
            }
            if (a.lastMessageTimestamp) return -1;
            if (b.lastMessageTimestamp) return 1;
            // Fallback to name
            return a.name.localeCompare(b.name);
        });
    };

    const processedFriends = getProcessedFriends();

    const filteredFriends = processedFriends.filter(friend =>
        friend.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTimeString = (date) => {
        if (!date) return "";
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (days < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    const renderFriend = ({ item }) => (
        <TouchableOpacity
            style={[styles.friendCard, { borderBottomColor: theme.border }]}
            onPress={() => router.push(`/chat/${item.id}`)}
            delayPressIn={0}
        >
            <View style={styles.avatarContainer}>
                {item.profileCode ? (
                    <Avatar seed={item.profileCode} size={48} />
                ) : (
                    <View style={[styles.defaultAvatar, { backgroundColor: theme.isDark ? '#222' : '#EFE8FF' }]}>
                        <Ionicons name="person" size={22} color="#7C3AED" />
                    </View>
                )}
            </View>
            <View style={styles.infoContainer}>
                <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                    {item.lastMessageTimestamp && (
                        <Text style={[styles.timeText, { color: theme.textTertiary }]}>{getTimeString(item.lastMessageTimestamp)}</Text>
                    )}
                </View>
                <View style={styles.messageRow}>
                    <Text style={[
                        styles.subtext,
                        { color: item.unreadCount > 0 ? theme.text : theme.textSecondary },
                        item.unreadCount > 0 && styles.unreadSubtext
                    ]} numberOfLines={1}>
                        {item.lastMessage || "Tap to chat"}
                    </Text>
                    {item.unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{item.unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <TabScreenWrapper>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: theme.background }]}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>
                </View>

                {/* Search */}
                <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
                    <View style={[styles.searchBar, { backgroundColor: theme.isDark ? '#222' : '#F3F4F6', borderColor: theme.border }]}>
                        <Ionicons name="search" size={18} color={theme.textSecondary} />
                        <TextInput
                          style={[styles.searchInput, { color: theme.text }]}
                          placeholder="Search friends..."
                          placeholderTextColor={theme.placeholder}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                <FlatList
                    data={filteredFriends}
                    keyExtractor={(item) => item.id}
                    renderItem={renderFriend}
                    style={{ backgroundColor: theme.background }}
                    contentContainerStyle={[styles.listContent, { backgroundColor: theme.background }]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={56} color={theme.textTertiary} />
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No friends found</Text>
                                <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>Connect with others to start chatting</Text>
                            </View>
                        )
                    }
                />
                {loading && (
                    <View style={[styles.loadingOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)' }]}>
                        <Loading size="large" color="#7C3AED" />
                    </View>
                )}
            </SafeAreaView>
        </TabScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "800",
        letterSpacing: -0.5,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 18,
        paddingHorizontal: 12,
        height: 38,
        gap: 8,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: "500",
        padding: 0,
        height: '100%',
    },
    listContent: {
        paddingBottom: 90,
    },
    friendCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    avatarContainer: {
        marginRight: 14,
    },
    defaultAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 3,
    },
    name: {
        fontSize: 15,
        fontWeight: "700",
    },
    timeText: {
        fontSize: 11,
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtext: {
        fontSize: 13,
        flex: 1,
        marginRight: 8,
    },
    unreadSubtext: {
        fontWeight: '700',
    },
    badge: {
        backgroundColor: '#EF5350',
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },
    emptyContainer: {
        alignItems: "center",
        paddingTop: 80,
        gap: 8,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "700",
    },
    emptySubtext: {
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 240,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
});
