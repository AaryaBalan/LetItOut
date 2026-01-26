import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
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

export default function FriendsList() {
    const { user } = useAuth();
    const router = useRouter();
    const [friends, setFriends] = useState([]);
    const [chats, setChats] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch Chats Metadata Real-time
    useEffect(() => {
        if (!user) return;

        // Listen to chats where I am a participant
        // Note: 'array-contains' is often used but here we check 'participants' array. 
        // Firestore limitation: cannot do 'array-contains' and other filters easily sometimes.
        // For now, let's try querying chats list. Ideally strict security rules allow reading only own chats.
        // Since our rule has: allow read: if request.auth != null && resource.data.participants.hasAny([request.auth.uid]);
        // We can query commonly used fields or just listen to all chars ID if stored in user profile (advanced),
        // OR we can't easily query ALL chats without a compound index if doing complex ordering.
        // Simpler approach: On client side, we know chat IDs are [uid1, uid2].sort().join('_').
        // But we don't know who we have chatted with unless we list friends.
        // SO: We will fetch friends first, then derive chat IDs and listen to them OR
        // Better: Query `collection(db, 'chats')` where `participants` array-contains `user.uid`.

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

    const fetchFriends = async () => {
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
    };

    useEffect(() => {
        fetchFriends();
    }, [user]);

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
            style={styles.friendCard}
            onPress={() => router.push(`/chat/${item.id}`)}
        >
            <View style={styles.avatarContainer}>
                {item.profileCode ? (
                    <Avatar seed={item.profileCode} size={50} />
                ) : (
                    <View style={styles.defaultAvatar}>
                        <Ionicons name="person" size={24} color="#9575cd" />
                    </View>
                )}
            </View>
            <View style={styles.infoContainer}>
                <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.lastMessageTimestamp && (
                        <Text style={styles.timeText}>{getTimeString(item.lastMessageTimestamp)}</Text>
                    )}
                </View>
                <View style={styles.messageRow}>
                    <Text style={[
                        styles.subtext,
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
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#212121" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Messages</Text>
                <View style={{ width: 28 }} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#BDBDBD" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search friends..."
                        placeholderTextColor="#BDBDBD"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item.id}
                renderItem={renderFriend}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color="#E0E0E0" />
                            <Text style={styles.emptyText}>No friends found</Text>
                            <Text style={styles.emptySubtext}>Connect with others to start chatting</Text>
                        </View>
                    )
                }
            />
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#9575cd" />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F5F5F5",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#212121",
    },
    searchContainer: {
        padding: 16,
        backgroundColor: "#FFFFFF",
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: "#212121",
    },
    listContent: {
        paddingBottom: 20,
    },
    friendCard: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#FAFAFA",
    },
    avatarContainer: {
        marginRight: 12,
    },
    defaultAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#EFE8FF",
        justifyContent: "center",
        alignItems: "center",
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    name: {
        fontSize: 16,
        fontWeight: "600",
        color: "#212121",
    },
    timeText: {
        fontSize: 12,
        color: '#9E9E9E',
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    subtext: {
        fontSize: 13,
        color: "#9E9E9E",
        flex: 1,
        marginRight: 8,
    },
    unreadSubtext: {
        color: '#212121',
        fontWeight: '600',
    },
    badge: {
        backgroundColor: '#EF5350',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: "center",
        paddingTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#757575",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#BDBDBD",
        marginTop: 4,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255,255,255,0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
});
