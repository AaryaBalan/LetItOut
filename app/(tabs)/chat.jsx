import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform
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
            style={[styles.friendCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push(`/chat/${item.id}`)}
            delayPressIn={0}
        >
            <View style={styles.avatarContainer}>
                {item.profileCode ? (
                    <Avatar seed={item.profileCode} size={55} />
                ) : (
                    <View style={[styles.defaultAvatar, { backgroundColor: theme.isDark ? '#222' : '#F8F5FF' }]}>
                        <Ionicons name="person" size={28} color="#111827" />
                    </View>
                )}
            </View>
            <View style={styles.infoContainer}>
                <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>{item.name}</Text>
                    {item.lastMessageTimestamp && (
                        <Text style={[styles.timeText, { color: theme.textTertiary }]}>{getTimeString(item.lastMessageTimestamp)}</Text>
                    )}
                </View>
                <View style={styles.messageRow}>
                    <Text style={[
                        styles.subtext,
                        { color: item.unreadCount > 0 ? theme.text : theme.textSecondary },
                        item.unreadCount > 0 && styles.unreadSubtext
                    ]} numberOfLines={2}>
                        {item.lastMessage || "Tap to chat"}
                    </Text>
                    
                    {/* Badge / Action Area */}
                    {item.unreadCount > 0 ? (
                        <View style={[styles.badge, { backgroundColor: '#8B5CF6' }]}>
                            <Text style={styles.badgeText}>{item.unreadCount}</Text>
                        </View>
                    ) : item.lastMessage ? (
                        <View style={[styles.badge, { backgroundColor: theme.isDark ? '#333' : '#F3F4F6' }]}>
                            <Ionicons name="checkmark-done" size={12} color={theme.textTertiary} />
                        </View>
                    ) : (
                        <View style={[styles.chatBtn, { backgroundColor: '#F8F5FF' }]}>
                            <Text style={[styles.chatBtnText, { color: '#8B5CF6' }]}>Chat</Text>
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
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>Messages</Text>
                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Connect, share & support</Text>
                    </View>
                    <TouchableOpacity style={[styles.composeButton, { backgroundColor: '#F8F5FF' }]}>
                        <Ionicons name="create-outline" size={22} color="#8B5CF6" />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={[styles.searchContainer, { backgroundColor: theme.background }]}>
                    <View style={[styles.searchBar, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB', borderWidth: 0 }]}>
                        <Ionicons name="search" size={20} color={theme.textSecondary} />
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
                        <Loading size="large" color="#111827" />
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
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: "800",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: "500",
    },
    composeButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 24,
        paddingHorizontal: 16,
        height: 48,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: "500",
        paddingHorizontal: 8,
        paddingVertical: 0,
        height: '100%',
        backgroundColor: "#d1cfd58e",
        borderRadius: 15,
    },
    listContent: {
        paddingBottom: 90,
    },
    friendCard: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 8,
        marginBottom: 8,
        padding: 5,
        paddingHorizontal: 10,
        borderRadius: 15,
        elevation: 1,
        borderWidth: 1,
    },
    avatarContainer: {
        marginRight: 16,
        width: 55,
        height: 55,
        borderRadius: 27.5,
        backgroundColor: '#F8F5FF',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    defaultAvatar: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
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
        marginBottom: 6,
    },
    name: {
        fontSize: 18,
        fontWeight: "800",
    },
    timeText: {
        fontSize: 11,
        fontWeight: "600",
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    subtext: {
        fontSize: 13,
        lineHeight: 18,
        flex: 1,
        marginRight: 12,
    },
    unreadSubtext: {
        fontWeight: '700',
    },
    badge: {
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
    },
    chatBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    chatBtnText: {
        fontSize: 12,
        fontWeight: '700',
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
