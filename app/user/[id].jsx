import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/Avatar";
import Loading from "../../components/Loading";
import PostCard from "../../components/PostCard";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Svg, { Path, Circle, Line, G, Text as SvgText } from "react-native-svg";
import { createFriendRequestNotification } from "../../utils/notifications";

export default function UserProfile() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { theme } = useTheme();
    const [userProfile, setUserProfile] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followStatus, setFollowStatus] = useState(null); // null (not following), 0 (requested), 1 (following), -1 (rejected)
    const [followLoading, setFollowLoading] = useState(false);
    const [perspectiveShifts, setPerspectiveShifts] = useState([]);

    // Format timestamp to "2h ago" style
    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return "";
        // Handle Firestore Timestamp
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return "Just now";
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    useEffect(() => {
        if (!id) return;

        const fetchUserAndPosts = async () => {
            try {
                // Fetch User Profile
                const userDocRef = doc(db, "users", id);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    setUserProfile(userDocSnap.data());
                } else {
                    console.log("No such user!");
                }

                // Fetch User's Public Posts
                // Query simplified even further: fetch all by author, filter & sort client-side
                // This avoids ALL index requirements for this specific view
                const postsRef = collection(db, "posts");
                const q = query(
                    postsRef,
                    where("authorId", "==", id)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const fetchedPosts = snapshot.docs
                        .map((doc) => {
                            const data = doc.data();
                            return {
                                id: doc.id,
                                ...data,
                                // timestamp formatted for display
                                timestamp: formatTimeAgo(data.createdAt),
                                // Keep raw timestamp for sorting
                                originalCreatedAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (new Date(data.createdAt).getTime() || 0)
                            };
                        })
                        // Filter out anonymous posts
                        .filter(post => !post.isAnonymous)
                        // Sort by date desc
                        .sort((a, b) => b.originalCreatedAt - a.originalCreatedAt);

                    setUserPosts(fetchedPosts);
                    setLoading(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error fetching user data:", error);
                setLoading(false);
            }
        };

        fetchUserAndPosts();
        fetchUserAndPosts();
    }, [id]);

    // Fetch perspective changes for this user to display in the graph
    useEffect(() => {
        if (!id || !currentUser) return;

        const q = query(
            collection(db, "notifications"),
            where("toUserId", "==", currentUser.uid),
            where("fromUserId", "==", id),
            where("type", "==", "perspective_change")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const shifts = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    rating: data.rating ?? 0,
                    createdAt: data.createdAt,
                };
            });

            // Sort in memory by createdAt ascending
            shifts.sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return aTime - bTime;
            });

            setPerspectiveShifts(shifts);
        }, (error) => {
            console.error("Error fetching perspective shifts:", error);
        });

        return () => unsubscribe();
    }, [id, currentUser]);

    // Check if current user is following this user
    useEffect(() => {
        if (!currentUser || !id) return;

        const checkFollowStatus = async () => {
            try {
                const q = query(
                    collection(db, "friends"),
                    where("followerId", "==", currentUser.uid),
                    where("followingId", "==", id)
                );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    // If 'status' is missing, assume it's an old record and treat as 'following' (1)
                    setFollowStatus(data.status !== undefined ? data.status : 1);
                } else {
                    setFollowStatus(null);
                }
            } catch (error) {
                console.error("Error checking follow status:", error);
            }
        };

        checkFollowStatus();
    }, [currentUser, id]);

    const handleToggleFollow = async () => {
        if (!currentUser) return;
        setFollowLoading(true);

        try {
            if (followStatus === 1) {
                // Unfollow (delete relationship)
                const q = query(
                    collection(db, "friends"),
                    where("followerId", "==", currentUser.uid),
                    where("followingId", "==", id)
                );
                const snapshot = await getDocs(q);
                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
                setFollowStatus(null);
            } else if (followStatus === 0) {
                // Cancel Request (delete relationship)
                const q = query(
                    collection(db, "friends"),
                    where("followerId", "==", currentUser.uid),
                    where("followingId", "==", id)
                );
                const snapshot = await getDocs(q);
                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
                setFollowStatus(null);
            } else {
                // Follow (create request with status 0)
                await addDoc(collection(db, "friends"), {
                    followerId: currentUser.uid,
                    followingId: id,
                    status: 0, // 0: Requested, 1: Accepted
                    createdAt: serverTimestamp(),
                });

                // Send Friend Request Notification instead of generic follow notification
                await createFriendRequestNotification(
                    id,
                    currentUser.uid,
                    currentUser.displayName
                );

                setFollowStatus(0);
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
        } finally {
            setFollowLoading(false);
        }
    };
    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
                <View style={styles.loadingContainer}>
                    <Loading size="large" color="#FF8A65" />
                </View>
            </SafeAreaView>
        );
    }

    if (!userProfile) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
                <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border, justifyContent: 'flex-start' }]}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB' }]}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="person-remove-outline" size={48} color={theme.textTertiary} />
                    <Text style={[styles.errorText, { color: theme.textSecondary }]}>User not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const renderPerspectiveChart = () => {
        if (perspectiveShifts.length === 0) {
            return null;
        }

        // Find max absolute value to scale y-axis
        const maxAbsValue = Math.max(...perspectiveShifts.map((s) => Math.abs(s.rating)), 10);
        
        const spacing = 65;
        const paddingLeft = 30;
        const chartHeight = 160;
        const baselineY = 80;
        
        // Map data to coordinates (x, y)
        const points = perspectiveShifts.map((shift, idx) => {
            const x = paddingLeft + idx * spacing;
            const y = baselineY - (shift.rating / maxAbsValue) * 55;
            return { x, y, rating: shift.rating, id: shift.id };
        });
        
        const svgWidth = Math.max(300, points.length * spacing + paddingLeft + 20);

        // Path for the line
        const linePath = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        
        // Path for the filled area under the line
        let areaPath = "";
        if (points.length > 0) {
            areaPath = `M ${points[0].x} ${baselineY} ` +
                       points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
                       ` L ${points[points.length - 1].x} ${baselineY} Z`;
        }

        return (
            <View style={[styles.chartContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.chartTitle, { color: theme.text }]}>Support Impact Timeline</Text>
                <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>
                    Mood change caused by your support comments on their stories
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                    <View style={{ width: svgWidth, height: chartHeight }}>
                        <Svg width={svgWidth} height={chartHeight}>
                            {/* Zero Baseline */}
                            <Line
                                x1={0}
                                y1={baselineY}
                                x2={svgWidth}
                                y2={baselineY}
                                stroke={theme.divider}
                                strokeWidth={1}
                                strokeDasharray="4 4"
                            />

                            {/* Filled Area */}
                            {areaPath ? (
                                <Path
                                    d={areaPath}
                                    fill={theme.isDark ? "rgba(149, 117, 205, 0.15)" : "rgba(149, 117, 205, 0.08)"}
                                />
                            ) : null}

                            {/* Continuous Line */}
                            {linePath ? (
                                <Path
                                    d={linePath}
                                    fill="none"
                                    stroke="#7C3AED"
                                    strokeWidth={3}
                                />
                            ) : null}

                            {/* Grid/Baseline markers */}
                            <SvgText
                                x={10}
                                y={baselineY - 4}
                                fontSize="9"
                                fontWeight="700"
                                fill={theme.textTertiary}
                            >
                                0
                            </SvgText>

                            {/* Points, values and sequence labels */}
                            {points.map((p, idx) => (
                                <G key={p.id || idx}>
                                    {/* Line down/up to baseline for visual guide */}
                                    <Line
                                        x1={p.x}
                                        y1={baselineY}
                                        x2={p.x}
                                        y2={p.y}
                                        stroke={p.rating >= 0 ? "rgba(102, 187, 106, 0.4)" : "rgba(229, 115, 115, 0.4)"}
                                        strokeWidth={1}
                                        strokeDasharray="2 2"
                                    />
                                    
                                    {/* Data Dot */}
                                    <Circle
                                        cx={p.x}
                                        cy={p.y}
                                        r={5}
                                        fill={p.rating >= 0 ? "#66BB6A" : "#E57373"}
                                        stroke={theme.surface}
                                        strokeWidth={2}
                                    />

                                    {/* Rating Value Text */}
                                    <SvgText
                                        x={p.x}
                                        y={p.y + (p.rating >= 0 ? -10 : 16)}
                                        fontSize="10"
                                        fontWeight="800"
                                        textAnchor="middle"
                                        fill={p.rating >= 0 ? "#66BB6A" : "#E57373"}
                                    >
                                        {p.rating >= 0 ? `+${p.rating}` : p.rating}
                                    </SvgText>
                                </G>
                            ))}
                        </Svg>
                    </View>
                </ScrollView>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
            <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB' }]}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Profile Card */}
                <View style={[styles.profileHeader, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
                    {/* Horizontal Profile Row */}
                    <View style={styles.profileRow}>
                        <View style={styles.avatarContainer}>
                            <Avatar seed={userProfile.profileCode || userProfile.email} size={80} />
                        </View>

                        <View style={styles.profileInfo}>
                            <Text style={[styles.displayName, { color: theme.text }]}>{userProfile.displayName}</Text>
                            <Text style={[styles.joinDate, { color: theme.textSecondary }]}>
                                Joined {userProfile.createdAt ? new Date(userProfile.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.bioText, { color: theme.textSecondary }]}>
                        {userProfile.bio || "Just someone trying to navigate life, one day at a time."}
                    </Text>

                    {currentUser && currentUser.uid !== id && (
                        <TouchableOpacity
                            style={[
                                styles.followButton,
                                { backgroundColor: theme.isDark ? '#FFFFFF' : '#1F2937' },
                                (followStatus === 1 || followStatus === 0) && [styles.followingButton, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F3F4F6', borderColor: theme.border }]
                            ]}
                            onPress={handleToggleFollow}
                            disabled={followLoading}
                        >
                            {followLoading ? (
                                <ActivityIndicator size="small" color={followStatus === 1 ? theme.textSecondary : theme.isDark ? "#000000" : "#FFF"} />
                            ) : (
                                <>
                                    <Ionicons
                                        name={followStatus === 1 ? "checkmark" : followStatus === 0 ? "time-outline" : "person-add"}
                                        size={16}
                                        color={followStatus === 1 || followStatus === 0 ? theme.text : (theme.isDark ? "#000000" : "#FFFFFF")}
                                    />
                                    <Text style={[
                                        styles.followButtonText,
                                        { color: followStatus === 1 || followStatus === 0 ? theme.text : (theme.isDark ? "#000000" : "#FFFFFF") }
                                    ]}>
                                        {followStatus === 1 ? "Following" : followStatus === 0 ? "Requested" : "Follow"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Stats */}
                    <View style={[styles.statsRow, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB' }]}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.text }]}>{userProfile.postCount || 0}</Text>
                            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Stories</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statNumber, { color: theme.text }]}>{userProfile.loveSent || 0}</Text>
                            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Love Sent</Text>
                        </View>
                    </View>
                </View>

                {/* Perspective Shift Chart */}
                {renderPerspectiveChart()}

                {/* Posts Section */}
                <View style={styles.postsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        Recent Stories
                        <Text style={[styles.postCount, { color: theme.textTertiary }]}> ({userPosts.length})</Text>
                    </Text>

                    {userPosts.length > 0 ? (
                        userPosts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))
                    ) : (
                        <View style={styles.emptyPostsState}>
                            <Ionicons name="document-text-outline" size={40} color={theme.textTertiary} />
                            <Text style={[styles.emptyPostsText, { color: theme.textTertiary }]}>No public stories shared yet</Text>
                        </View>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileHeader: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    profileRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        marginBottom: 16,
    },
    profileInfo: {
        flex: 1,
    },
    nameRoleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    avatarContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    displayName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#111827",
    },
    joinDate: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    roleBagde: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginBottom: 8,
    },
    roleText: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    bioText: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 12,
        lineHeight: 18,
    },
    followButton: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    followingButton: {
        borderWidth: 1,
        shadowOpacity: 0,
        elevation: 0,
    },
    followButtonText: {
        fontSize: 14,
        fontWeight: "700",
    },
    followingButtonText: {
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 32,
        width: '100%',
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
    },
    statNumber: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 0,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: "600",
    },
    statDivider: {
        width: 1,
        height: 30,
    },
    postsSection: {
        padding: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 10,
    },
    postCount: {
        fontSize: 16,
        fontWeight: "500",
    },
    emptyPostsState: {
        alignItems: "center",
        paddingVertical: 40,
        gap: 12,
    },
    emptyPostsText: {
        fontSize: 14,
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    errorText: {
        fontSize: 16,
    },
    chartContainer: {
        margin: 16,
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    chartTitle: {
        fontSize: 15,
        fontWeight: "800",
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    chartSubtitle: {
        fontSize: 12,
        marginBottom: 16,
    },
    emptyChartText: {
        fontSize: 13,
        fontStyle: "italic",
        textAlign: "center",
        paddingVertical: 20,
    },
    chartScroll: {
        paddingVertical: 10,
    },
    chartWrapper: {
        height: 120,
        flexDirection: "row",
        alignItems: "flex-end",
        position: "relative",
        paddingHorizontal: 10,
        gap: 16,
    },
    zeroBaseline: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 50,
        height: 1,
        opacity: 0.5,
    },
    chartCol: {
        width: 32,
        alignItems: "center",
        height: "100%",
        position: "relative",
    },
    chartBar: {
        width: 14,
        position: "absolute",
    },
    barValueText: {
        fontSize: 10,
        fontWeight: "700",
        position: "absolute",
        width: 40,
        textAlign: "center",
    },
    chartColLabel: {
        fontSize: 9,
        fontWeight: "600",
        position: "absolute",
        bottom: 0,
    },
});
