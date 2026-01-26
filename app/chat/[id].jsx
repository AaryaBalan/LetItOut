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
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmojiPicker from "rn-emoji-keyboard";
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

    // Emoji & Keyboard State
    const [showEmojiBoard, setShowEmojiBoard] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Reply State
    const [replyingTo, setReplyingTo] = useState(null);
    const [selectedMessageId, setSelectedMessageId] = useState(null);

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

    // Listen to Messages
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

            if (msgs.length > 0 && user) {
                setDoc(doc(db, "chats", chatId), {
                    [`unreadCount_${user.uid}`]: 0
                }, { merge: true }).catch(console.error);
            }
        });

        return () => unsubscribe();
    }, [chatId, user]);

    // Handle Keyboard events
    // Handle Keyboard events with height tracking
    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            (e) => {
                setShowEmojiBoard(false);
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

    const sendMessage = async () => {
        if (!inputText.trim() || !user || !chatId) return;

        const text = inputText.trim();
        const currentReply = replyingTo;

        setInputText("");
        setSending(true);
        setReplyingTo(null);
        setShowEmojiBoard(false);
        setSelectedMessageId(null);

        try {
            const chatRef = doc(db, "chats", chatId);

            await setDoc(chatRef, {
                participants: [user.uid, id],
                lastMessage: text,
                lastMessageTimestamp: serverTimestamp(),
                updatedAt: serverTimestamp(),
                [`unreadCount_${id}`]: increment(1),
            }, { merge: true });

            const messageData = {
                text: text,
                senderId: user.uid,
                senderName: user.displayName || "Anonymous",
                createdAt: serverTimestamp(),
            };

            if (currentReply) {
                messageData.replyToId = currentReply.id;
                messageData.replyToText = currentReply.text;
                messageData.replyToSender = currentReply.senderName;
            }

            await addDoc(collection(db, "chats", chatId, "messages"), messageData);

        } catch (error) {
            console.error("Error sending message:", error);
            alert("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleEmojiSelected = (emojiObject) => {
        setInputText((prev) => prev + emojiObject.emoji);
    };

    const toggleEmojiBoard = () => {
        if (showEmojiBoard) {
            setShowEmojiBoard(false);
        } else {
            Keyboard.dismiss();
            setShowEmojiBoard(true);
        }
    };

    const handleMessagePress = (message) => {
        if (selectedMessageId === message.id) {
            setSelectedMessageId(null);
        } else {
            setSelectedMessageId(message.id);
        }
    };

    const handleReply = (message) => {
        setReplyingTo({
            id: message.id,
            text: message.text,
            senderName: message.senderId === user.uid ? "You" : (recipient?.name || "Them")
        });
        setSelectedMessageId(null);
        // Focus input?
    };

    // --- Helper UI Functions ---

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

        if (date.toDateString() === now.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const renderItem = ({ item, index }) => {
        const isMe = item.senderId === user.uid;
        const prevMessage = messages[index - 1];
        const isSelected = selectedMessageId === item.id;

        // Date Header Logic
        let showDateHeader = false;
        if (!prevMessage) {
            showDateHeader = true;
        } else if (item.createdAt && prevMessage.createdAt) {
            const currDate = item.createdAt.toDate ? item.createdAt.toDate() : new Date();
            const prevDate = prevMessage.createdAt.toDate ? prevMessage.createdAt.toDate() : new Date();
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
                    styles.messageRowContainer,
                    isMe ? styles.myMessageRowContainer : styles.theirMessageRowContainer
                ]}>
                    {/* Reply Icon for 'Them' on the Right (or Left? Design requested 'next to it').
                        Standard: 
                        Me (Right aligned): Icon on Left of bubble.
                        Them (Left aligned): Icon on Right of bubble.
                    */}
                    {!isMe && isSelected && (
                        <TouchableOpacity style={styles.replyButton} onPress={() => handleReply(item)}>
                            <Ionicons name="return-up-back" size={24} color="#757575" />
                        </TouchableOpacity>
                    )}

                    {isMe && isSelected && (
                        <TouchableOpacity style={styles.replyButton} onPress={() => handleReply(item)}>
                            <Ionicons name="return-up-back" size={24} color="#757575" />
                        </TouchableOpacity>
                    )}

                    <Pressable
                        onPress={() => handleMessagePress(item)}
                        style={[
                            styles.messageBubbleWrapper,
                            isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper
                        ]}
                    >
                        <View style={[
                            styles.bubble,
                            isMe ? styles.myBubble : styles.theirBubble
                        ]}>
                            {item.replyToText && (
                                <View style={[
                                    styles.replyPreview,
                                    isMe ? styles.myReplyPreview : styles.theirReplyPreview
                                ]}>
                                    <Text style={[
                                        styles.replySender,
                                        isMe ? styles.myReplySender : styles.theirReplySender
                                    ]}>{item.replyToSender}</Text>
                                    <Text numberOfLines={1} style={[
                                        styles.replyText,
                                        isMe ? styles.myReplyText : styles.theirReplyText
                                    ]}>{item.replyToText}</Text>
                                </View>
                            )}

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
                    </Pressable>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color="#212121" />
                    </TouchableOpacity>
                    {recipient && (
                        <View style={styles.headerAvatar}>
                            {recipient.profileCode ? <Avatar seed={recipient.profileCode} size={40} /> : <View style={styles.defaultHeaderAvatar}><Ionicons name="person" size={20} color="#9575cd" /></View>}
                        </View>
                    )}
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>{recipient ? recipient.name : "Chat"}</Text>
                    <Text style={styles.headerSubtitle}>ACTIVE SUPPORTER</Text>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#757575" />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, paddingBottom: Platform.OS === "android" ? keyboardHeight : 0 }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
                >
                    <View style={{ flex: 1 }}>
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
                    </View>

                    {/* Reply Banner */}
                    {replyingTo && (
                        <View style={styles.replyBanner}>
                            <View style={styles.replyBannerLine} />
                            <View style={styles.replyBannerContent}>
                                <Text style={styles.replyBannerSender}>Replying to {replyingTo.senderName}</Text>
                                <Text numberOfLines={1} style={styles.replyBannerText}>{replyingTo.text}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Ionicons name="close" size={20} color="#757575" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.inputWrapper}>
                        <TouchableOpacity style={styles.emojiButton} onPress={toggleEmojiBoard}>
                            <Ionicons name={showEmojiBoard ? "keypad" : "happy-outline"} size={28} color="#9E9E9E" />
                        </TouchableOpacity>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Type a message..."
                                placeholderTextColor="#9E9E9E"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                onFocus={() => setShowEmojiBoard(false)}
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

                    {/* Emoji Keyboard */}
                    {showEmojiBoard && (
                        <EmojiPicker
                            onEmojiSelected={handleEmojiSelected}
                            open={showEmojiBoard}
                            onClose={() => setShowEmojiBoard(false)}
                        />
                    )}
                </KeyboardAvoidingView>
            </View>
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
    backButton: { marginRight: 8 },
    headerAvatar: { marginRight: 10 },
    defaultHeaderAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: "#EFE8FF", justifyContent: "center", alignItems: "center",
    },
    headerContent: { flex: 1, justifyContent: 'center' },
    headerTitle: { fontSize: 16, fontWeight: "700", color: "#212121" },
    headerSubtitle: { fontSize: 11, fontWeight: "600", color: "#9F8BFF", marginTop: 1 },
    moreButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

    messagesList: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
    dateHeaderContainer: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
    dateHeaderBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    dateHeaderText: { fontSize: 11, fontWeight: "600", color: "#9E9E9E", textTransform: 'uppercase' },

    messageRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    myMessageRowContainer: {
        justifyContent: 'flex-end',
    },
    theirMessageRowContainer: {
        justifyContent: 'flex-start',
    },

    messageBubbleWrapper: {
        maxWidth: '80%',
    },
    myBubbleWrapper: {
        alignItems: 'flex-end',
    },
    theirBubbleWrapper: {
        alignItems: 'flex-start',
    },

    replyButton: {
        padding: 8,
    },

    bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
    myBubble: { backgroundColor: "#9F8BFF", borderBottomRightRadius: 4 },
    theirBubble: {
        backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#F0F0F0", borderBottomLeftRadius: 4,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    },

    messageText: { fontSize: 15, lineHeight: 22 },
    myMessageText: { color: "#FFFFFF" },
    theirMessageText: { color: "#212121" },

    timestamp: { fontSize: 11, color: "#9E9E9E", marginTop: 4 },
    myTimestamp: { textAlign: 'right' },
    theirTimestamp: { textAlign: 'left' },

    inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF' },
    emojiButton: { marginRight: 12 },
    inputContainer: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#F5F5F5", borderRadius: 28, paddingHorizontal: 6, paddingVertical: 6 },
    input: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, maxHeight: 100, color: "#212121", marginLeft: 8 },
    sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFAB91", justifyContent: "center", alignItems: "center" },

    replyBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E0E0E0'
    },
    replyBannerLine: { width: 4, height: 36, backgroundColor: '#9F8BFF', borderRadius: 2, marginRight: 12 },
    replyBannerContent: { flex: 1 },
    replyBannerSender: { fontSize: 12, fontWeight: '700', color: '#9F8BFF', marginBottom: 2 },
    replyBannerText: { fontSize: 12, color: '#757575' },

    replyPreview: {
        marginBottom: 6, padding: 8, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderLeftWidth: 3,
    },
    myReplyPreview: { backgroundColor: 'rgba(255,255,255,0.2)', borderLeftColor: '#FFFFFF' },
    theirReplyPreview: { backgroundColor: '#F5F5F5', borderLeftColor: '#9F8BFF' },
    replySender: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
    myReplySender: { color: '#FFFFFF' },
    theirReplySender: { color: '#9F8BFF' },
    replyText: { fontSize: 11 },
    myReplyText: { color: 'rgba(255,255,255,0.8)' },
    theirReplyText: { color: '#757575' },
});
