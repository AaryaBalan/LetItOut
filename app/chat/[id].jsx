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
    where
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
import { useTheme } from "../../context/ThemeContext";

// Helper functions for category colors
const getCategoryColor = (category) => {
    const colors = {
        Study: "#FFE082",
        "Mental Health": "#B39DDB",
        Mindfulness: "#FFE082",
        Stress: "#FFAB91",
        Anxiety: "#B39DDB",
        Relationship: "#F48FB1",
        Family: "#80CBC4"
    };
    return colors[category] || "#E5E7EB";
};

// SharedPostCard component with live data
function SharedPostCard({ postData, isMe }) {
    const router = useRouter();
    const { theme } = useTheme();
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

    // Get category colors based on the theme, to match PostCard
    const getCategoryColors = (category, isDark) => {
        const normalized = category === "Anxiety" ? "Stress" : (category === "Mindfulness" ? "Mental Health" : category);
        const colors = {
            "Family": { bg: isDark ? "#EBF3FE" : "#EBF3FE", text: isDark ? "#8AB4F8" : "#2F80ED" },
            "Stress": { bg: isDark ? "#FCEEEE" : "#FCEEEE", text: isDark ? "#F28B82" : "#EB5757" },
            "Relationship": { bg: isDark ? "#FEF9E6" : "#FEF9E6", text: isDark ? "#F8BBD0" : "#F2C94C" },
            "Study": { bg: isDark ? "#E9F7EF" : "#E9F7EF", text: isDark ? "#81C995" : "#27AE60" },
            "Mental Health": { bg: isDark ? "#EEF2FF" : "#EEF2FF", text: isDark ? "#FDD663" : "#6366F1" },
            "Other": { bg: isDark ? "#3C4043" : "#F1F3F4", text: isDark ? "#E8EAED" : "#3C4043" }
        };
        return colors[normalized] || colors["Other"];
    };

    return (
        <TouchableOpacity
            style={[styles.sharedPostCard, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF', borderColor: isMe ? '#B39DDB' : '#FFD5C6', borderWidth: 2 }]}
            onPress={() => router.push(`/post/${postData.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`View post: ${postData.title}`}
        >
            {/* Author Section with Category Badge */}
            <View style={styles.postAuthorSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    {postData.isAnonymous || !postData.authorName || postData.authorName === "Anonymous" || !authorProfileCode ? (
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="person" size={20} color="#111827" />
                        </View>
                    ) : (
                        <Avatar seed={authorProfileCode} size={40} />
                    )}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.postAuthorName, { color: theme.text }]} numberOfLines={1}>
                            {postData.isAnonymous ? "Anonymous" : (postData.authorName || "Anonymous")}
                        </Text>
                        <Text style={[styles.postTimestamp, { color: theme.textSecondary }]}>{postData.timestamp}</Text>
                    </View>
                </View>

                {/* Category Badge */}
                <View style={[styles.postCategoryBadge, { backgroundColor: getCategoryColors(postData.category, theme.isDark).bg }]}>
                    <Text style={[styles.postCategoryText, { color: getCategoryColors(postData.category, theme.isDark).text }]}>
                        {postData.category?.toUpperCase() || "OTHER"}
                    </Text>
                </View>
            </View>

            {/* Title */}
            <Text style={[styles.postTitle, { color: theme.text }]}>{postData.title}</Text>

            {/* Description */}
            <Text style={[styles.postPreview, { color: theme.textSecondary }]} numberOfLines={3}>
                {postData.description}
            </Text>

            {/* Footer with reactions */}
            <View style={styles.postFooter}>
                <View style={styles.postReactions}>
                    <View style={[styles.postReactionPill, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF', borderColor: theme.border }]}>
                        <Ionicons name="heart" size={16} color="#EB5757" />
                        <Text style={[styles.postReactionCount, { color: theme.text }]}>{likeCount}</Text>
                    </View>
                    <View style={[styles.postReactionPill, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF', borderColor: theme.border }]}>
                        <Ionicons name="hand-left" size={16} color="#F2C94C" />
                        <Text style={[styles.postReactionCount, { color: theme.text }]}>{hugCount}</Text>
                    </View>
                    <View style={[styles.postReactionPill, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF', borderColor: theme.border }]}>
                        <Ionicons name="happy" size={16} color="#27AE60" />
                        <Text style={[styles.postReactionCount, { color: theme.text }]}>{meTooCount}</Text>
                    </View>
                    <View style={[styles.postReactionPill, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF', borderColor: theme.border }]}>
                        <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
                        <Text style={[styles.postReactionCount, { color: theme.text }]}>{commentCount}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const { theme } = useTheme();
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
                        profileCode: userData.profileCode || userData.email || null
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
                ...doc.data()
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
                [`unreadCount_${id}`]: increment(1)
            }, { merge: true });

            const messageData = {
                text: text,
                senderId: user.uid,
                senderName: user.displayName || "Anonymous",
                createdAt: serverTimestamp()
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
                            <Ionicons name="return-up-back" size={24} color="#6B7280" />
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
                                <SharedPostCard postData={item.sharedPost} isMe={isMe} />
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
                        <View style={[
                            styles.timestampContainer,
                            isMe ? styles.myTimestampContainer : styles.theirTimestampContainer
                        ]}>
                            <Text style={styles.timestamp}>
                                {formatTime(item.createdAt)}
                            </Text>
                            {isMe && <Ionicons name="checkmark-done" size={14} color="#8B5CF6" style={{ marginLeft: 4 }} />}
                        </View>
                    </Pressable>

                    {/* Reply button on RIGHT for THEIR messages (left-aligned) */}
                    {!isMe && isSelected && (
                        <TouchableOpacity style={styles.replyButton} onPress={() => handleReply(item)}>
                            <Ionicons name="return-up-back" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.background }]}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: '#F8F5FF' }]}>
                        <Ionicons name="chevron-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    {recipient && (
                        <View style={styles.headerAvatar}>
                            {recipient.profileCode ? <Avatar seed={recipient.profileCode} size={44} /> : <View style={[styles.defaultHeaderAvatar, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F3E5F5' }]}><Ionicons name="person" size={22} color="#111827" /></View>}
                        </View>
                    )}
                </View>
                <View style={styles.headerContent}>
                    <Text style={[styles.headerTitle, { color: theme.text, fontFamily: 'Frederick', textTransform: 'uppercase' }]}>{recipient ? recipient.name : "Chat"}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Active now</Text>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50', marginLeft: 6 }} />
                    </View>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#8B5CF6" />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, paddingBottom: Platform.OS === "android" && keyboardHeight > 0 ? keyboardHeight + 20 : 0, backgroundColor: theme.background }}>
                <KeyboardAvoidingView
                    style={{ flex: 1, backgroundColor: theme.background }}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 115 : 0}
                >
                    <View style={{ flex: 1, backgroundColor: theme.background }}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            style={{ backgroundColor: theme.background }}
                            contentContainerStyle={[styles.messagesList, { backgroundColor: theme.background }]}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            ListEmptyComponent={
                                !loading && (
                                    <View style={[styles.emptyChatContainer, { backgroundColor: theme.background }]}>
                                        <View style={styles.emptyChatAvatarContainer}>
                                            {recipient && recipient.profileCode ?
                                                <Avatar seed={recipient.profileCode} size={80} /> :
                                                <View style={[styles.defaultHeaderAvatar, { width: 80, height: 80, borderRadius: 40 }]}>
                                                    <Ionicons name="person" size={40} color="#111827" />
                                                </View>
                                            }
                                            <View style={styles.onlineBadge} />
                                        </View>
                                        <Text style={styles.emptyChatTitle}>
                                            Say hello to {recipient ? recipient.name.split(' ')[0] : "them"}!
                                        </Text>
                                        <Text style={styles.emptyChatSubtitle}>
                                            Start the conversation with a friendly wave 👋
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.waveButton}
                                            onPress={() => {
                                                setInputText("👋");
                                                sendMessage();
                                            }}
                                        >
                                            <Text style={styles.waveButtonText}>👋 Wave</Text>
                                        </TouchableOpacity>
                                    </View>
                                )
                            }
                        />
                    </View>

                    {/* Reply Banner */}
                    {replyingTo && (
                        <View style={[styles.replyBanner, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
                            <View style={styles.replyBannerLine} />
                            <View style={styles.replyBannerContent}>
                                <Text style={styles.replyBannerSender}>Replying to {replyingTo.senderName}</Text>
                                <Text numberOfLines={1} style={styles.replyBannerText}>{replyingTo.text}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Ionicons name="close" size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={[styles.inputWrapper, { backgroundColor: theme.background, paddingBottom: keyboardHeight > 0 ? 24 : (Platform.OS === 'ios' ? 28 : 20) }]}>
                        <TouchableOpacity style={[styles.emojiButton, { borderColor: '#8B5CF6' }]} onPress={toggleEmojiBoard}>
                            <Ionicons name={showEmojiBoard ? "keypad" : "happy-outline"} size={22} color="#8B5CF6" />
                        </TouchableOpacity>

                        <View style={[styles.inputContainer, { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }]}>
                            <TextInput
                                style={[styles.input, { color: theme.text }]}
                                placeholder="Type a message..."
                                placeholderTextColor="#9CA3AF"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                onFocus={() => setShowEmojiBoard(false)}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.sendButton, { backgroundColor: '#8B5CF6' }]}
                            onPress={sendMessage}
                            disabled={!inputText.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginLeft: 3 }} />
                            )}
                        </TouchableOpacity>
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
        backgroundColor: "#FFFFFF"
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: "#E5E7EB"
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    backButton: {
        marginRight: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerAvatar: { marginRight: 12 },
    defaultHeaderAvatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: "#F3E5F5", justifyContent: "center", alignItems: "center"
    },
    headerContent: { flex: 1, justifyContent: 'center' },
    headerTitle: { fontSize: 16, letterSpacing: 1 },
    headerSubtitle: { fontSize: 11, color: "#6B7280" },
    moreButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },

    messagesList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
    dateHeaderContainer: { alignItems: 'center', marginBottom: 16, marginTop: 12 },
    dateHeaderBadge: { backgroundColor: '#F8F9FA', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
    dateHeaderText: { fontSize: 10, fontFamily: 'Fredoka-Bold', color: "#9E9E9E", textTransform: 'uppercase', letterSpacing: 0.5 },

    messageRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    messageRow: { marginBottom: 4, maxWidth: '80%' },
    myMessageRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    myMessageRowContainer: {
        justifyContent: 'flex-end'
    },
    theirMessageRowContainer: {
        justifyContent: 'flex-start'
    },

    messageBubbleWrapper: {
        maxWidth: '80%'
    },
    myBubbleWrapper: {
        alignItems: 'flex-end'
    },
    theirBubbleWrapper: {
        alignItems: 'flex-start'
    },

    replyButton: {
        padding: 8
    },

    bubble: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20
    },
    myBubble: {
        backgroundColor: "#B39DDB",
        borderBottomRightRadius: 4
    },
    theirBubble: {
        backgroundColor: "#FFD5C6",
        borderBottomLeftRadius: 4
    },
    sharedPostBubbleContainer: {
        paddingVertical: 4,
        paddingHorizontal: 4,
        borderRadius: 18,
        backgroundColor: "transparent"
    },

    messageText: { fontSize: 15, lineHeight: 20 },
    myMessageText: { color: "#FFFFFF" },
    theirMessageText: { color: "#111827" },

    timestampContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4
    },
    myTimestampContainer: {
        justifyContent: 'flex-end'
    },
    theirTimestampContainer: {
        justifyContent: 'flex-start'
    },
    timestamp: { fontSize: 10, color: "#9E9E9E" },

    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10
    },
    emojiButton: {
        marginRight: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center'
    },
    inputContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 24,
        paddingHorizontal: 4,
        borderWidth: 1,
        marginRight: 10
    },
    input: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
    sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", shadowColor: "#9F8BFF", shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },

    replyBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB'
    },
    replyBannerLine: { width: 4, height: 36, backgroundColor: '#9F8BFF', borderRadius: 2, marginRight: 12 },
    replyBannerContent: { flex: 1 },
    replyBannerSender: { fontSize: 12, fontFamily: 'Fredoka-Bold', color: '#9F8BFF', marginBottom: 2 },
    replyBannerText: { fontSize: 12, color: '#6B7280' },

    replyPreview: {
        marginBottom: 6,
        padding: 8,
        borderRadius: 8,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderLeftWidth: 3
    },
    myReplyPreview: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderLeftColor: '#FFFFFF'
    },
    theirReplyPreview: {
        backgroundColor: '#FFD7C4',
        borderLeftColor: '#FF8A65'
    },
    replySender: {
        fontSize: 11,
        fontWeight: '400',
        marginBottom: 3,
        letterSpacing: 0.3,
        fontFamily: 'Fredoka-Regular'
    },
    myReplySender: {
        color: '#FFFFFF',
        opacity: 0.95
    },
    theirReplySender: {
        color: '#7C5FD9'
    },
    replyText: {
        fontSize: 12,
        lineHeight: 16,
        fontStyle: '',
        fontFamily: 'Fredoka-Regular'
    },
    myReplyText: {
        color: 'rgba(255,255,255,0.85)'
    },
    theirReplyText: {
        color: '#5A5A5A'
    },
    sharedPostCard: {
        backgroundColor: "#FFFFFF",
        padding: 8,
        borderRadius: 20,
        minWidth: 280,
        width: '100%',
        marginTop: 4,
        elevation: 0.5
    },
    postAuthorSection: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16
    },
    postCategoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12
    },
    postCategoryText: {
        fontSize: 10,
        fontWeight: '400',
        letterSpacing: 0.5,
        fontFamily: 'Fredoka-Regular'
    },
    postAuthorName: {
        fontSize: 15,
        fontWeight: '400',
        letterSpacing: -0.3,
        fontFamily: 'Fredoka-Regular'
    },
    postTimestamp: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular'
    },
    postTitle: {
        fontSize: 18,
        fontFamily: 'Frederick',
        marginBottom: 8,
        lineHeight: 28,
        letterSpacing: -0.5
    },
    postPreview: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 20,
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular'
    },
    postFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    postReactions: {
        flexDirection: "row",
        gap: 10,
        flexWrap: 'wrap'
    },
    postReactionPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 24,
        borderWidth: 1
    },
    postReactionCount: {
        fontSize: 13,
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular'
    },
    // Empty Chat UI Styles
    emptyChatContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 40,
        marginTop: 60
    },
    emptyChatAvatarContainer: {
        marginBottom: 24,
        position: "relative"
    },
    onlineBadge: {
        position: "absolute",
        bottom: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#4CAF50",
        borderWidth: 2,
        borderColor: "#FFFFFF"
    },
    emptyChatTitle: {
        fontSize: 20,
        color: "#111827",
        marginBottom: 8,
        textAlign: "center",
        fontFamily: 'Frederick'
    },
    emptyChatSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 20,
        fontFamily: 'Frederick'
    },
    waveButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: "#EFE8FF",
        borderRadius: 24
    },
    waveButtonText: {
        fontSize: 16,
        fontWeight: '400',
        color: "#111827",
        fontFamily: 'Fredoka-Regular'
    }
});
