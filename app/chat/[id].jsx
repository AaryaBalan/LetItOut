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
    where,
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

// Helper functions for category colors
const getCategoryColor = (category) => {
    const colors = {
        Study: "#FFE082",
        "Mental Health": "#B39DDB",
        Mindfulness: "#FFE082",
        Stress: "#FFAB91",
        Anxiety: "#B39DDB",
        Relationship: "#F48FB1",
        Family: "#80CBC4",
    };
    return colors[category] || "#E0E0E0";
};

// SharedPostCard component with live data
function SharedPostCard({ postData }) {
    const router = useRouter();
    const [likeCount, setLikeCount] = useState(0);
    const [hugCount, setHugCount] = useState(0);
    const [meTooCount, setMeTooCount] = useState(0);
    const [commentCount, setCommentCount] = useState(0);

    // Fetch reaction counts from Firebase in real-time
    useEffect(() => {
        if (!postData.id) return;

        const reactionsRef = collection(db, "reactions");
        const q = query(reactionsRef, where("postId", "==", String(postData.id)));

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
        }, (error) => {
            console.error("Error fetching reactions:", error);
        });

        return () => unsubscribe();
    }, [postData.id]);

    // Fetch comment count from Firebase in real-time
    useEffect(() => {
        if (!postData.id) return;

        const commentsRef = collection(db, "comments");
        const q = query(commentsRef, where("postId", "==", String(postData.id)));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCommentCount(snapshot.size);
        }, (error) => {
            console.error("Error fetching comments:", error);
        });

        return () => unsubscribe();
    }, [postData.id]);

    // Fetch author profile code
    const [authorProfileCode, setAuthorProfileCode] = useState(null);

    useEffect(() => {
        if (!postData.authorId || postData.isAnonymous) {
            setAuthorProfileCode(null);
            return;
        }

        const userRef = doc(db, "users", postData.authorId);
        const unsubscribe = onSnapshot(
            userRef,
            (docSnapshot) => {
                if (docSnapshot.exists()) {
                    const userData = docSnapshot.data();
                    setAuthorProfileCode(
                        userData.profileCode || userData.email || null,
                    );
                } else {
                    setAuthorProfileCode(null);
                }
            },
            (error) => {
                console.error("Error fetching author profile:", error);
                setAuthorProfileCode(null);
            }
        );

        return () => unsubscribe();
    }, [postData.authorId, postData.isAnonymous]);

    return (
        <TouchableOpacity
            style={styles.sharedPostCard}
            onPress={() => router.push(`/post/${postData.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`View post: ${postData.title}`}
        >
            {/* Category Badge */}
            <View style={styles.postCardHeader}>
                <View style={[
                    styles.postCategoryBadge,
                    { backgroundColor: getCategoryColor(postData.category) }
                ]}>
                    <Text style={styles.postCategoryText}>
                        {postData.category?.toUpperCase() || "GENERAL"}
                    </Text>
                </View>
            </View>

            {/* Author Section */}
            <View style={styles.postAuthorSection}>
                {postData.isAnonymous || !postData.authorName || postData.authorName === "Anonymous" || !authorProfileCode ? (
                    <View style={styles.postAvatarContainer}>
                        <Ionicons name="person" size={16} color="#9575cd" />
                    </View>
                ) : (
                    <View style={styles.postAvatarWrapper}>
                        <Avatar seed={authorProfileCode} size={32} />
                    </View>
                )}
                <View>
                    <Text style={styles.postAuthorName}>
                        {postData.isAnonymous ? "Anonymous" : (postData.authorName || "Anonymous")}
                    </Text>
                    <Text style={styles.postTimestamp}>{postData.timestamp}</Text>
                </View>
            </View>

            {/* Title */}
            <Text style={styles.postTitle}>{postData.title}</Text>

            {/* Description */}
            <Text style={styles.postPreview} numberOfLines={3}>
                {postData.description}
            </Text>

            {/* Footer with reactions */}
            <View style={styles.postFooter}>
                <View style={styles.postReactions}>
                    <View style={styles.postReactionButton}>
                        <Ionicons name="heart" size={16} color="#E57373" />
                        <Text style={styles.postReactionCount}>{likeCount}</Text>
                    </View>
                    <View style={styles.postReactionButton}>
                        <Ionicons name="hand-left" size={16} color="#FFB74D" />
                        <Text style={styles.postReactionCount}>{hugCount}</Text>
                    </View>
                    <View style={styles.postReactionButton}>
                        <Ionicons name="happy" size={16} color="#66BB6A" />
                        <Text style={styles.postReactionCount}>{meTooCount}</Text>
                    </View>
                </View>
                <View style={styles.postCommentSection}>
                    <Ionicons name="chatbubble-outline" size={18} color="#9E9E9E" />
                    <Text style={styles.postCommentCount}>{commentCount}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

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
                    {/* Reply button on LEFT for MY messages (right-aligned) */}
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
                            isMe ? styles.myBubble : styles.theirBubble,
                            item.type === "shared_post" && styles.sharedPostBubbleContainer
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

                            {item.type === "shared_post" && item.sharedPost && (
                                <SharedPostCard postData={item.sharedPost} />
                            )}

                            {item.type !== "shared_post" && (
                                <Text style={[
                                    styles.messageText,
                                    isMe ? styles.myMessageText : styles.theirMessageText
                                ]}>
                                    {item.text}
                                </Text>
                            )}
                        </View>
                        <Text style={[
                            styles.timestamp,
                            isMe ? styles.myTimestamp : styles.theirTimestamp
                        ]}>
                            {formatTime(item.createdAt)}
                        </Text>
                    </Pressable>

                    {/* Reply button on RIGHT for THEIR messages (left-aligned) */}
                    {!isMe && isSelected && (
                        <TouchableOpacity style={styles.replyButton} onPress={() => handleReply(item)}>
                            <Ionicons name="return-up-back" size={24} color="#757575" />
                        </TouchableOpacity>
                    )}
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
        // Soft shadow instead of border
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: { marginRight: 8, padding: 4 },
    headerAvatar: { marginRight: 12 },
    defaultHeaderAvatar: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: "#F3E5F5", justifyContent: "center", alignItems: "center",
        borderWidth: 1, borderColor: "#FFFFFF"
    },
    headerContent: { flex: 1, justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: "700", color: "#212121", letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 11, fontWeight: "600", color: "#9F8BFF", marginTop: 2, letterSpacing: 0.5 },
    moreButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

    messagesList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
    dateHeaderContainer: { alignItems: 'center', marginBottom: 10, marginTop: 6 },
    dateHeaderBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    dateHeaderText: { fontSize: 10, fontWeight: "600", color: "#9E9E9E", textTransform: 'uppercase' },

    messageRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    messageRow: { marginBottom: 4, maxWidth: '80%' },
    myMessageRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
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

    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    myBubble: {
        backgroundColor: "#9F8BFF",
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: "#FFAB91",
        borderBottomLeftRadius: 4,
    },
    sharedPostBubbleContainer: {
        paddingVertical: 2,
        paddingHorizontal: 2,
        borderRadius: 18,
    },

    messageText: { fontSize: 15, lineHeight: 20 },
    myMessageText: { color: "#FFFFFF" },
    theirMessageText: { color: "#212121" },

    timestamp: { fontSize: 10, color: "#9E9E9E", marginTop: 2 },
    myTimestamp: { textAlign: 'right' },
    theirTimestamp: { textAlign: 'left' },

    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    emojiButton: { marginRight: 8, padding: 4 },
    inputContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F5F5",
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: "#EEEEEE",
    },
    input: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: "#212121" },
    sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#9F8BFF", justifyContent: "center", alignItems: "center", shadowColor: "#9F8BFF", shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },

    replyBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E0E0E0'
    },
    replyBannerLine: { width: 4, height: 36, backgroundColor: '#9F8BFF', borderRadius: 2, marginRight: 12 },
    replyBannerContent: { flex: 1 },
    replyBannerSender: { fontSize: 12, fontWeight: '700', color: '#9F8BFF', marginBottom: 2 },
    replyBannerText: { fontSize: 12, color: '#757575' },

    replyPreview: {
        marginBottom: 6,
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderLeftWidth: 3,
    },
    myReplyPreview: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderLeftColor: '#FFFFFF',
    },
    theirReplyPreview: {
        backgroundColor: '#FFD7C4',
        borderLeftColor: '#FF8A65',
    },
    replySender: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 3,
        letterSpacing: 0.3,
    },
    myReplySender: {
        color: '#FFFFFF',
        opacity: 0.95,
    },
    theirReplySender: {
        color: '#7C5FD9',
    },
    replyText: {
        fontSize: 12,
        lineHeight: 16,
        fontStyle: 'italic',
    },
    myReplyText: {
        color: 'rgba(255,255,255,0.85)',
    },
    theirReplyText: {
        color: '#5A5A5A',
    },
    sharedPostCard: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        borderRadius: 16,
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        minWidth: 260,
        width: '100%',
    },
    postCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    postCategoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    postCategoryText: {
        fontSize: 9,
        fontWeight: "700",
        color: "#212121",
        letterSpacing: 0.3,
    },
    postTimestamp: {
        fontSize: 11,
        color: "#BDBDBD",
    },
    postAuthorSection: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    postAvatarContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#EFE8FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    postAvatarWrapper: {
        marginRight: 8,
    },
    postAuthorName: {
        fontSize: 12,
        fontWeight: "600",
        color: "#9575cd",
    },
    postTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#212121",
        marginBottom: 6,
        lineHeight: 20,
    },
    postPreview: {
        fontSize: 13,
        color: "#757575",
        lineHeight: 18,
        marginBottom: 14,
    },
    postFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    postReactions: {
        flexDirection: "row",
        gap: 16,
    },
    postReactionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    postReactionCount: {
        fontSize: 12,
        fontWeight: "600",
        color: "#757575",
    },
    postCommentSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    postCommentCount: {
        fontSize: 12,
        fontWeight: "600",
        color: "#757575",
    },
});
