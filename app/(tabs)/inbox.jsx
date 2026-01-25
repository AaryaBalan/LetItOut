import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/Avatar";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { createFriendRequestAcceptedNotification } from "../../utils/notifications";

export default function Inbox() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userProfileCodes, setUserProfileCodes] = useState({});

    // Fetch notifications in real-time
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const notificationsRef = collection(db, "notifications");
        const q = query(
            notificationsRef,
            where("toUserId", "==", user.uid),
            orderBy("createdAt", "desc"),
        );

        const unsubscribe = onSnapshot(
            q,
            async (snapshot) => {
                const fetchedNotifications = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data(),
                }));
                setNotifications(fetchedNotifications);

                // Fetch profile codes for all unique users
                const userIds = [
                    ...new Set(
                        fetchedNotifications.map((n) => n.fromUserId || n.senderId).filter(Boolean),
                    ),
                ];
                const profileCodes = {};

                for (const userId of userIds) {
                    try {
                        const userDoc = await getDoc(doc(db, "users", userId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            profileCodes[userId] =
                                userData.profileCode || userData.email || null;
                        }
                    } catch (error) {
                        console.error("Error fetching user profile:", error);
                    }
                }

                setUserProfileCodes(profileCodes);
                setLoading(false);
                setRefreshing(false);
            },
            (error) => {
                console.error("Error fetching notifications:", error);
                setLoading(false);
                setRefreshing(false);
            },
        );

        return () => unsubscribe();
    }, [user]);

    // Get time ago string
    const getTimeAgo = (timestamp) => {
        if (!timestamp) return "Just now";
        const now = new Date();
        const notifDate = new Date(timestamp);
        const diffInMs = now - notifDate;
        const diffInMinutes = Math.floor(diffInMs / 60000);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return "Just now";
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays === 1) return "Yesterday";
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return `${Math.floor(diffInDays / 7)}w ago`;
    };

    // Get notification icon and color
    const getNotificationIcon = (type) => {
        switch (type) {
            case "like":
                return {
                    name: "heart",
                    color: "#FF6B9D",
                    bgColor: "#FFE5EE",
                };
            case "hug":
                return {
                    name: "hand-left",
                    color: "#9B7EDE",
                    bgColor: "#EFE8FF",
                };
            case "metoo":
                return {
                    name: "happy",
                    color: "#9B7EDE",
                    bgColor: "#EFE8FF",
                };
            case "comment":
                return {
                    name: "chatbubble",
                    color: "#FF8A65",
                    bgColor: "#FFE8E0",
                };
            case "follow":
                return {
                    name: "person-add",
                    color: "#4DD0E1",
                    bgColor: "#E0F7FA",
                };
            case "friend_request":
                return {
                    name: "person-add",
                    color: "#4DD0E1",
                    bgColor: "#E0F7FA",
                };
            case "friend_request_accepted":
                return {
                    name: "checkmark-circle",
                    color: "#66BB6A",
                    bgColor: "#E8F5E9",
                };
            default:
                return {
                    name: "notifications",
                    color: "#9E9E9E",
                    bgColor: "#F5F5F5",
                };
        }
    };

    // Get notification message
    const getNotificationMessage = (notification) => {
        const userName = notification.fromUserName;
        switch (notification.type) {
            case "like":
                return { text: "Liked your story", emoji: "❤️" };
            case "hug":
                return { text: "Sent you a Hug", emoji: "🤗" };
            case "metoo":
                return { text: "Feels the same", emoji: "😊" };
            case "comment":
                const preview =
                    notification.commentText?.length > 40
                        ? notification.commentText.substring(0, 40) + "..."
                        : notification.commentText;
                return { text: `Replied to your story: "${preview}"`, emoji: "" };
            case "follow":
                return { text: "Started following you", emoji: "👋" };
            case "friend_request":
                return { text: "Sent you a friend request", emoji: "👋" };
            case "friend_request_accepted":
                return { text: "Accepted your friend request", emoji: "✅" };
            default:
                return { text: "New notification", emoji: "" };
        }
    };

    // Separate notifications into recent and earlier
    const separateNotifications = () => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const recent = notifications.filter((n) => {
            const notifDate = new Date(n.createdAt);
            return notifDate > oneDayAgo;
        });

        const earlier = notifications.filter((n) => {
            const notifDate = new Date(n.createdAt);
            return notifDate <= oneDayAgo;
        });

        return { recent, earlier };
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const batch = writeBatch(db);
            notifications
                .filter((n) => !n.read)
                .forEach((notif) => {
                    const notifRef = doc(db, "notifications", notif.id);
                    batch.update(notifRef, { read: true });
                });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    // Handle notification press
    const handleNotificationPress = async (notification) => {
        try {
            // Mark as read
            if (!notification.read) {
                await updateDoc(doc(db, "notifications", notification.id), {
                    read: true,
                });
            }
            // Navigate based on type
            if (notification.type === 'follow' || notification.type === 'friend_request' || notification.type === 'friend_request_accepted') {
                router.push(`/user/${notification.fromUserId || notification.senderId}`);
            } else {
                router.push(`/post/${notification.postId}`);
            }
        } catch (error) {
            console.error("Error handling notification:", error);
        }
    };

    const handleAccept = async (notification) => {
        try {
            // 1. Update friend status to 1 (Accepted)
            const q = query(
                collection(db, "friends"),
                where("followerId", "==", notification.fromUserId),
                where("followingId", "==", user.uid)
            );
            const snapshot = await getDocs(query(collection(db, "friends"), where("followerId", "==", notification.fromUserId), where("followingId", "==", user.uid)));

            if (!snapshot.empty) {
                const friendDoc = snapshot.docs[0];
                await updateDoc(friendDoc.ref, { status: 1 });
            } else {
                console.log("Friend request doc not found");
                return;
            }

            // 2. Mark notification as read (and maybe add 'accepted' flag)
            await updateDoc(doc(db, "notifications", notification.id), {
                read: true,
                status: 'accepted'
            });

            // 3. Send acceptance notification back to sender
            await createFriendRequestAcceptedNotification(
                notification.fromUserId,
                user.uid,
                user.displayName
            );

        } catch (error) {
            console.error("Error accepting friend request:", error);
        }
    };

    const handleReject = async (notification) => {
        try {
            // 1. Update friend status to -1 (Rejected)
            const q = query(
                collection(db, "friends"),
                where("followerId", "==", notification.fromUserId),
                where("followingId", "==", user.uid)
            );
            const snapshot = await getDocs(query(collection(db, "friends"), where("followerId", "==", notification.fromUserId), where("followingId", "==", user.uid)));

            if (!snapshot.empty) {
                const friendDoc = snapshot.docs[0];
                await updateDoc(friendDoc.ref, { status: -1 });
            }

            // 2. Mark notification as read/rejected
            await updateDoc(doc(db, "notifications", notification.id), {
                read: true,
                status: 'rejected'
            });

        } catch (error) {
            console.error("Error rejecting friend request:", error);
        }
    };


    // Refresh notifications
    const onRefresh = () => {
        setRefreshing(true);
    };

    // Render notification item
    const renderNotification = ({ item }) => {
        const icon = getNotificationIcon(item.type);
        const message = getNotificationMessage(item);
        const senderId = item.fromUserId || item.senderId;
        const profileCode = userProfileCodes[senderId];

        return (
            <TouchableOpacity
                style={styles.notificationCard}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.avatarWithIcon}>
                    {profileCode ? (
                        <Avatar seed={profileCode} size={40} />
                    ) : (
                        <View style={styles.defaultAvatar}>
                            <Ionicons name="person" size={20} color="#9575cd" />
                        </View>
                    )}
                    <View
                        style={[
                            styles.notificationIcon,
                            { backgroundColor: icon.bgColor },
                        ]}
                    >
                        <Ionicons name={icon.name} size={14} color={icon.color} />
                    </View>
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.textRow}>
                        <View style={styles.textContainer}>
                            <Text style={styles.username}>{item.fromUserName}</Text>
                            <Text style={styles.message}>
                                {message.text} {message.emoji}
                            </Text>
                        </View>
                        <View style={styles.rightContainer}>
                            <Text style={styles.timestamp}>
                                {getTimeAgo(item.createdAt)}
                            </Text>
                            {!item.read && <View style={styles.unreadDot} />}
                        </View>
                    </View>

                    {/* Friend Request Actions */}
                    {item.type === 'friend_request' && !item.status && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.acceptButton]}
                                onPress={() => handleAccept(item)}
                            >
                                <Text style={styles.acceptButtonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.rejectButton]}
                                onPress={() => handleReject(item)}
                            >
                                <Text style={styles.rejectButtonText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {(item.status === 'accepted') && (
                        <Text style={styles.statusText}>Accepted</Text>
                    )}
                    {(item.status === 'rejected') && (
                        <Text style={styles.statusText}>Rejected</Text>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    // Show login prompt
    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Inbox</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <Ionicons name="log-in-outline" size={64} color="#BDBDBD" />
                    <Text style={styles.emptyTitle}>Not Logged In</Text>
                    <Text style={styles.emptySubtitle}>
                        Please log in to view notifications
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // Show loading
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Inbox</Text>
                </View>
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color="#B39DDB" style={{ marginBottom: 16 }} />
                    <Text style={styles.emptyTitle}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Show empty state
    if (notifications.length === 0) {
        return (
            <SafeAreaView style={styles.container} edges={["top"]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <TouchableOpacity style={styles.settingsButton}>
                        <Ionicons name="settings-outline" size={24} color="#2D2D2D" />
                    </TouchableOpacity>
                </View>
                <ScrollView
                    contentContainerStyle={styles.emptyContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                >
                    <Ionicons
                        name="notifications-outline"
                        size={80}
                        color="#D1D1D6"
                    />
                    <Text style={styles.emptyTitle}>No Notifications</Text>
                    <Text style={styles.emptySubtitle}>
                        When people interact with your posts,{"\n"}you'll see
                        notifications here
                    </Text>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Show notifications list
    const { recent, earlier } = separateNotifications();
    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={24} color="#2D2D2D" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {recent.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>RECENT</Text>
                            {unreadCount > 0 && (
                                <TouchableOpacity onPress={markAllAsRead}>
                                    <Text style={styles.markAllRead}>
                                        MARK ALL AS READ
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {recent.map((item) => (
                            <View key={item.id}>{renderNotification({ item })}</View>
                        ))}
                    </View>
                )}

                {earlier.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>EARLIER</Text>
                        </View>
                        {earlier.map((item) => (
                            <View key={item.id}>{renderNotification({ item })}</View>
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
        backgroundColor: "#F8F9FA",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: "#2D2D2D",
        letterSpacing: -0.5,
    },
    settingsButton: {
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    section: {
        marginTop: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#9E9E9E",
        letterSpacing: 0.5,
    },
    markAllRead: {
        fontSize: 13,
        fontWeight: "600",
        color: "#A78BFA",
        letterSpacing: 0.3,
    },
    notificationCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginHorizontal: 10,
        marginBottom: 8,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    avatarWithIcon: {
        position: "relative",
        width: 48,
        height: 48,
        marginRight: 12,
    },
    defaultAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#EFE8FF",
        justifyContent: "center",
        alignItems: "center",
    },
    notificationIcon: {
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
    },
    textRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    username: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2D2D2D",
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
    },
    rightContainer: {
        alignItems: "flex-end",
    },
    timestamp: {
        fontSize: 13,
        color: "#9E9E9E",
        marginBottom: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#A78BFA",
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#2D2D2D",
        marginTop: 20,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#9E9E9E",
        textAlign: "center",
        lineHeight: 22,
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 12,
    },
    actionButton: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#4DD0E1',
    },
    rejectButton: {
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
    },
    rejectButtonText: {
        color: '#757575',
        fontWeight: '600',
        fontSize: 13,
    },
    statusText: {
        fontSize: 12,
        color: '#9E9E9E',
        marginTop: 8,
        fontStyle: 'italic',
    },
});
