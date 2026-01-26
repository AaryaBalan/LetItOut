import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    increment,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/Avatar";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const flatListRef = useRef(null);

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [recipient, setRecipient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Derive Chat ID
    const chatId = user && id ? [user.uid, id].sort().join("_") : null;

    // Fetch Recipient Details
    useEffect(() => {
        const fetchRecipient = async () => {
            try {
                const userDoc = await getDoc(doc(db, "users", id));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setRecipient({
                        id: id,
                        name: userData.displayName || "Anonymous",
                        profileCode: userData.profileCode || userData.email || null,
                    });
                }
            } catch (error) {
                console.error("Error fetching recipient:", error);
            }
        };

        if (id) fetchRecipient();
    }, [id]);

    // Listen to Messages and Reset Unread
    useEffect(() => {
        if (!chatId) return;

        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMessages(msgs);
            setLoading(false);

            // Reset unread count if we have messages and user is viewing
            if (msgs.length > 0 && user) {
                setDoc(doc(db, "chats", chatId), {
                    [`unreadCount_${user.uid}`]: 0
                }, { merge: true }).catch(err => console.log(err));
            }
        });

        return () => unsubscribe();
    }, [chatId, user]);

    const sendMessage = async () => {
        if (!inputText.trim() || !user || !chatId) return;

        const text = inputText.trim();
        setInputText("");
        setSending(true);

        try {
            const chatRef = doc(db, "chats", chatId);

            await setDoc(chatRef, {
                participants: [user.uid, id],
                lastMessage: text,
                lastMessageTimestamp: serverTimestamp(),
                updatedAt: serverTimestamp(),
                [`unreadCount_${id}`]: increment(1),
            }, { merge: true });

            await addDoc(collection(db, "chats", chatId, "messages"), {
                text: text,
                senderId: user.uid,
                senderName: user.displayName || "Anonymous",
                createdAt: serverTimestamp(),
            });

        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    // --- Helper Functions for UI ---

    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date();
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    const formatDateHeader = (timestamp) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date();
        const now = new Date();
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);

        if (date.toDateString() === now.toDateString()) {
            return "Today";
        }
        if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Group messages for rendering to insert dates?
    // Simplified strategy: We'll render Date Header if the diff > X mins or day changes.
    // For this design, let's just show a date header at the start of a "session" or day.

    // Process messages to inject headers is expensive in render. 
    // Let's do it in renderItem by checking prev item.

    const renderItem = ({ item, index }) => {
        const isMe = item.senderId === user.uid;
        const prevMessage = messages[index - 1];

        let showDateHeader = false;
        if (!prevMessage) {
            showDateHeader = true;
        } else if (item.createdAt && prevMessage.createdAt) {
            const currDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date();
            const prevDate = prevMessage.createdAt.toDate ? prevMessage.createdAt.toDate() : new Date();

            // Show header ONLY if the day changes
            if (currDate.toDateString() !== prevDate.toDateString()) {
                showDateHeader = true;
            }
        }

        return (
            <View>
                {showDateHeader && (
                    <View style={styles.dateHeaderContainer}>
                        <View style={styles.dateHeaderBadge}>
                            <Text style={styles.dateHeaderText}>
                                {formatDateHeader(item.createdAt)}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={[
                    styles.messageRow,
                    isMe ? styles.myMessageRow : styles.theirMessageRow
                ]}>
                    <View style={[
                        styles.bubble,
                        isMe ? styles.myBubble : styles.theirBubble
                    ]}>
                        <Text style={[
                            styles.messageText,
                            isMe ? styles.myMessageText : styles.theirMessageText
                        ]}>
                            {item.text}
                        </Text>
                    </View>
                    <Text style={[
                        styles.timestamp,
                        isMe ? styles.myTimestamp : styles.theirTimestamp
                    ]}>
                        {formatTime(item.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Custom Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#212121" />
                    </TouchableOpacity>

                    {recipient && (
                        <View style={styles.headerAvatar}>
                            {recipient.profileCode ? (
                                <Avatar seed={recipient.profileCode} size={40} />
                            ) : (
                                <View style={styles.defaultHeaderAvatar}>
                                    <Ionicons name="person" size={20} color="#9575cd" />
                                </View>
                            )}
                        </View>
                    )}
                </View>

                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>
                        {recipient ? recipient.name : "Chat"}
                    </Text>
                    <Text style={styles.headerSubtitle}>ACTIVE SUPPORTER</Text>
                </View>

                <TouchableOpacity style={styles.moreButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#757575" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>Start a conversation!</Text>
                            </View>
                        )
                    }
                />

                {/* Input Area */}
                <View style={styles.inputWrapper}>
                    <TouchableOpacity style={styles.plusButton}>
                        <Ionicons name="add-circle" size={32} color="#BDBDBD" />
                    </TouchableOpacity>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor="#9E9E9E"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity
                            style={styles.sendButton}
                            onPress={sendMessage}
                            disabled={!inputText.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Safe Area Spacer if needed (handled by SafeAreaView edges usually but sometimes KeyboardAvoidingView interferes) */}
                <View style={{ height: Platform.OS === 'ios' ? 10 : 10, backgroundColor: '#FFFFFF' }} />
            </KeyboardAvoidingView>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F5F5F5",
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 8,
    },
    headerAvatar: {
        marginRight: 10,
    },
    defaultHeaderAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#EFE8FF",
        justifyContent: "center",
        alignItems: "center",
    },
    headerContent: {
        flex: 1,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#212121",
    },
    headerSubtitle: {
        fontSize: 11,
        fontWeight: "600",
        color: "#9F8BFF",
        marginTop: 1,
    },
    moreButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    keyboardView: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    messagesList: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    dateHeaderContainer: {
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
    },
    dateHeaderBadge: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 10,
    },
    dateHeaderText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#9E9E9E",
        textTransform: 'uppercase',
    },
    messageRow: {
        marginBottom: 8, // Reduced from 16
        maxWidth: '80%',
    },
    myMessageRow: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    theirMessageRow: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    bubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
    },
    myBubble: {
        backgroundColor: "#9F8BFF", // The purple color from screenshot
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: "#FFFFFF", // White bubble
        borderWidth: 1,
        borderColor: "#F0F0F0",
        borderBottomLeftRadius: 4,
        // Shadow for white bubble to pop slightly
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    myMessageText: {
        color: "#FFFFFF",
    },
    theirMessageText: {
        color: "#212121",
    },
    timestamp: {
        fontSize: 11,
        color: "#9E9E9E",
        marginTop: 4,
    },
    myTimestamp: {
        textAlign: 'right',
    },
    theirTimestamp: {
        textAlign: 'left',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#FFFFFF',
        // borderTopWidth: 1,
        // borderTopColor: '#F5F5F5',
    },
    plusButton: {
        marginRight: 12,
    },
    inputContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
        borderRadius: 28,
        paddingHorizontal: 6,
        paddingVertical: 6,
    },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 15,
        maxHeight: 100,
        color: "#212121",
        marginLeft: 8,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FFAB91", // Peach/Orange color
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: '#9E9E9E',
        fontSize: 14,
        fontStyle: 'italic',
    }
});
