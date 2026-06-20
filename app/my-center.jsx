import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../components/Avatar";
import Loading from "../components/Loading";
import { db } from "../config/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { createPerspectiveNotification } from "../utils/notifications";

export default function MyCenter() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [commentsByPost, setCommentsByPost] = useState({});
  const [activeTab, setActiveTab] = useState("posts"); // "posts" or "insights"
  const [selectedPost, setSelectedPost] = useState(null); // Selected post for comments detail view
  const [ratingFeedback, setRatingFeedback] = useState({}); // Track saved status: { [commentId]: 'Saved!' }
  const [expandedCommentId, setExpandedCommentId] = useState(null);

  // 1. Fetch current user's posts
  useEffect(() => {
    if (!user) return;

    const postsRef = collection(db, "posts");
    const q = query(postsRef, where("authorId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            feelPercentage: data.feelPercentage ?? 0,
            category: data.category || "Other",
            createdAt: data.createdAt,
          };
        });

        fetchedPosts.sort((a, b) => {
          const aTime = a.createdAt?.seconds
            ? a.createdAt.seconds * 1000
            : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const bTime = b.createdAt?.seconds
            ? b.createdAt.seconds * 1000
            : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return bTime - aTime;
        });

        setPosts(fetchedPosts);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching my posts:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Fetch comments for each post in real-time
  useEffect(() => {
    if (posts.length === 0) return;

    const unsubscribes = posts.map((post) => {
      const commentsRef = collection(db, "comments");
      const q = query(commentsRef, where("postId", "==", post.id));

      return onSnapshot(q, (snapshot) => {
        const postComments = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.comment || data.text,
            commentorId: data.commentorId,
            commentorName: data.commentorName || "Anonymous",
            commentorAvatar: data.commentorAvatar || "anonymous",
            perspectiveRating: data.perspectiveRating, 
            createdAt: data.createdAt,
            postId: post.id,
            postTitle: post.title,
          };
        });

        setCommentsByPost((prev) => ({
          ...prev,
          [post.id]: postComments,
        }));
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [posts]);

  const handleRatingChange = async (post, comment, val) => {
    try {
      const initial = post.feelPercentage ?? 0;
      const prevRating = comment.perspectiveRating !== undefined ? comment.perspectiveRating : initial;
      const delta = val - prevRating;

      const commentRef = doc(db, "comments", comment.id);
      await updateDoc(commentRef, {
        perspectiveRating: val,
      });

      if (delta !== 0) {
        await createPerspectiveNotification(
          comment.commentorId,
          post.id,
          post.title,
          user.uid,
          user.displayName || "Anonymous",
          delta,
          comment.id
        );
      }

      const feedbackText = delta > 0 ? `+${delta} Shift!` : `${delta} Shift!`;
      setRatingFeedback((prev) => ({ ...prev, [comment.id]: feedbackText }));
      setTimeout(() => {
        setRatingFeedback((prev) => {
          const copy = { ...prev };
          delete copy[comment.id];
          return copy;
        });
      }, 2500);

    } catch (error) {
      console.error("Error saving perspective rating:", error);
      Alert.alert("Error", "Failed to save rating.");
    }
  };

  const getMoodColor = (mood) => {
    if (mood < 0) return "#7986CB"; // Sad
    if (mood > 0) return "#FFB74D"; // Happy
    return "#9E9E9E"; // Neutral
  };

  const getCategoryColors = (category, isDark) => {
    const normalized = category === "Anxiety" ? "Stress" : (category === "Mindfulness" ? "Mental Health" : category);
    const colors = {
      "Family": { bg: isDark ? "#1E3A8A" : "#EFF6FF", text: isDark ? "#93C5FD" : "#2563EB" },
      "Stress": { bg: isDark ? "#7F1D1D" : "#FEF2F2", text: isDark ? "#FCA5A5" : "#DC2626" },
      "Relationship": { bg: isDark ? "#78350F" : "#FFFBEB", text: isDark ? "#FCD34D" : "#D97706" },
      "Study": { bg: isDark ? "#14532D" : "#F0FDF4", text: isDark ? "#86EFAC" : "#16A34A" },
      "Mental Health": { bg: isDark ? "#4C1D95" : "#F5F3FF", text: isDark ? "#C4B5FD" : "#7C3AED" },
      "Other": { bg: isDark ? "#374151" : "#F3F4F6", text: isDark ? "#D1D5DB" : "#4B5563" },
    };
    return colors[normalized] || colors["Other"];
  };

  const getCategoryLabel = (category) => {
    const labels = {
      Study: "STUDY SUPPORT",
      "Mental Health": "MENTAL HEALTH",
      Mindfulness: "MINDFULNESS",
    };
    return labels[category] || (category ? category.toUpperCase() : "OTHER");
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Just now";

    if (typeof timestamp === 'string') {
      if (timestamp === 'Just now') return timestamp;
      const match = timestamp.match(/^(\d+)d ago$/);
      if (match) {
        const days = parseInt(match[1], 10);
        if (days >= 7) {
          const weeks = Math.floor(days / 7);
          const months = Math.floor(days / 30);
          const years = Math.floor(days / 365);
          if (days < 30) return `${weeks}w ago`;
          if (days < 365) return `${months}mon ago`;
          return `${years}yr ago`;
        }
      }
      const parsedDate = new Date(timestamp);
      if (isNaN(parsedDate.getTime())) {
        return timestamp;
      }
      timestamp = parsedDate;
    }

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    if (isNaN(date.getTime())) return "Just now";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${diffWeeks}w ago`;
    if (diffDays < 365) return `${diffMonths}mon ago`;
    return `${diffYears}yr ago`;
  };

  const getPostCumulativeScore = (post) => {
    const comments = commentsByPost[post.id] || [];
    const initial = post.feelPercentage ?? 0;

    const sumAdjusted = comments.reduce((acc, c) => {
      const rating = c.perspectiveRating !== undefined ? c.perspectiveRating : initial;
      const delta = rating - initial;
      return acc + delta;
    }, 0);

    const cumulative = initial + sumAdjusted;
    return Math.max(-100, Math.min(100, cumulative));
  };


  const renderMoodShiftTrack = (post, isMini = false) => {
    const initial = post.feelPercentage ?? 0;
    const current = getPostCumulativeScore(post);

    const initialPct = `${(initial + 100) / 2}%`;
    const currentPct = `${(current + 100) / 2}%`;

    const delta = current - initial;
    const isImprovement = delta >= 0;

    if (isMini) {
      return (
        <View style={styles.miniTrackContainer}>
          <View style={styles.miniTrackBar}>
            <View style={[styles.moodTrackLine, { backgroundColor: '#E5E7EB' }]} />
            <View style={[
              styles.moodTrackConnector,
              {
                left: delta >= 0 ? initialPct : currentPct,
                width: `${Math.abs(delta) / 2}%`,
                backgroundColor: isImprovement ? '#10B981' : '#EF4444'
              }
            ]} />
            <View style={[styles.miniMoodPoint, { left: initialPct, backgroundColor: '#8B5CF6', zIndex: 1 }]} />
            <View style={[styles.miniMoodPoint, { left: currentPct, backgroundColor: isImprovement ? '#10B981' : '#EF4444', zIndex: 2 }]} />
          </View>
          <View style={styles.miniTrackLabels}>
            <Text style={[styles.miniTrackText, { color: '#6B7280' }]}>INITIAL: <Text style={{ color: '#6B7280' }}>{initial}</Text></Text>
            <Text style={[styles.miniTrackText, { color: isImprovement ? '#10B981' : '#EF4444' }]}>
              CURRENT: <Text style={{ fontWeight: '800' }}>{current} ({delta >= 0 ? `+${delta}` : delta})</Text>
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.moodTrackContainer}>
        <View style={styles.moodTrackLabelRow}>
          <View style={styles.moodLabelGroup}>
            <Text style={[styles.moodTrackLabel, { color: theme.textSecondary }]}>Initial Mood</Text>
            <Text style={[styles.moodTrackVal, { color: getMoodColor(initial) }]}>
              {initial > 0 ? `+${initial}` : initial}
            </Text>
          </View>

          <View style={[styles.moodLabelGroup, { alignItems: 'flex-end' }]}>
            <Text style={[styles.moodTrackLabel, { color: theme.text }]}>Cumulative Mood</Text>
            <Text style={[styles.moodTrackVal, { color: getMoodColor(current), fontWeight: '800' }]}>
              {current > 0 ? `+${current}` : current}
            </Text>
          </View>
        </View>

          <View style={{ height: 6, backgroundColor: theme.isDark ? '#2A2A2F' : '#E5E7EB', borderRadius: 3, position: 'relative', marginVertical: 8 }}>
            <View style={[
              styles.moodTrackConnector,
              {
                left: delta >= 0 ? initialPct : currentPct,
                width: `${Math.abs(delta) / 2}%`,
                backgroundColor: isImprovement ? '#10B981' : '#EF4444'
              }
            ]} />

            <View style={[styles.moodPoint, { left: initialPct, backgroundColor: '#8B5CF6' }]} />
            <View style={[styles.moodPoint, { left: currentPct, backgroundColor: isImprovement ? '#10B981' : '#EF4444', zIndex: 2 }]} />
          </View>

        <View style={styles.moodTrackInfoRow}>
          <Ionicons name={isImprovement ? "trending-up" : "trending-down"} size={16} color={isImprovement ? '#10B981' : '#EF4444'} />
          <Text style={[styles.moodShiftText, { color: isImprovement ? '#10B981' : '#EF4444' }]}>
            {delta === 0 ? "No shift in perspective yet" : `Perspective shifted by ${delta > 0 ? '+' : ''}${delta} points`}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <Loading size="large" color="#111827" />
        </View>
      </SafeAreaView>
    );
  }

  const avgShift = (() => {
    if (posts.length === 0) return 0;
    const totalShift = posts.reduce((sum, post) => {
      const initial = post.feelPercentage ?? 0;
      const current = getPostCumulativeScore(post);
      return sum + (current - initial);
    }, 0);
    return Math.round(totalShift / posts.length);
  })();

  const getPostInsights = (post) => {
    const comments = commentsByPost[post.id] || [];
    const initial = post.feelPercentage ?? 0;
    const current = getPostCumulativeScore(post);
    const shift = current - initial;

    let bestComment = null;
    let maxRating = -Infinity;
    comments.forEach((c) => {
      if (c.perspectiveRating !== undefined && c.perspectiveRating > maxRating) {
        maxRating = c.perspectiveRating;
        bestComment = c;
      }
    });

    return {
      initial,
      current,
      shift,
      bestComment,
      hasComments: comments.length > 0,
      hasRatedComments: comments.some(c => c.perspectiveRating !== undefined)
    };
  };

  const renderMoodIcon = (mood) => {
    if (mood > 50) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="happy-outline" size={26} color="#10B981" />
          <Ionicons name="sparkles-outline" size={14} color="#10B981" style={{ position: 'absolute', top: -6, right: -8 }} />
        </View>
      );
    } else if (mood > 0) {
      return <Ionicons name="happy-outline" size={26} color="#10B981" />;
    } else if (mood > -50) {
      return <Ionicons name="sad-outline" size={26} color="#EF4444" />;
    } else {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="sad-outline" size={26} color="#EF4444" />
          <Ionicons name="water-outline" size={14} color="#EF4444" style={{ position: 'absolute', top: 12, right: -6 }} />
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          onPress={() => {
            if (selectedPost) setSelectedPost(null);
            else router.back();
          }}
          style={[styles.backButton, { backgroundColor: theme.isDark ? '#374151' : '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase' }]}>
            {selectedPost ? "Post Comments" : "My Center"}
          </Text>
          {!selectedPost && (
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Your space. Your voice. Your growth.
            </Text>
          )}
        </View>
        <TouchableOpacity style={[styles.settingsButton, { backgroundColor: theme.isDark ? '#374151' : '#F8F5FF' }]}>
          <Ionicons name="settings-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {!selectedPost && (
        <View style={[styles.tabBarContainer, { borderBottomColor: theme.divider }]}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "posts" && styles.activeTabItem]}
              onPress={() => setActiveTab("posts")}
            >
              <Ionicons name="document-text-outline" size={18} color={activeTab === "posts" ? theme.text : theme.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === "posts" ? theme.text : theme.textSecondary }, activeTab === "posts" && styles.activeTabText]}>
                POSTS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === "insights" && styles.activeTabItem]}
              onPress={() => setActiveTab("insights")}
            >
              <Ionicons name="analytics-outline" size={18} color={activeTab === "insights" ? theme.text : theme.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === "insights" ? theme.text : theme.textSecondary }, activeTab === "insights" && styles.activeTabText]}>
                INSIGHTS
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedPost ? (
        // --- 1. SINGLE POST COMMENTS DETAIL VIEW ---
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.selectedPostContainer, { borderBottomColor: theme.divider }]}>
            <View style={styles.postHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.postTitleLarge, { color: getCategoryColors(selectedPost.category, theme.isDark).text }]}>
                  {selectedPost.title}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 8 }}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColors(selectedPost.category, theme.isDark).bg }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColors(selectedPost.category, theme.isDark).text }]}>
                      {getCategoryLabel(selectedPost.category)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: theme.textTertiary, fontWeight: '500' }}>
                    {formatTimestamp(selectedPost.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={[styles.moodBadge, { backgroundColor: getMoodColor(selectedPost.feelPercentage) + "22" }]}>
                <Text style={[styles.moodText, { color: getMoodColor(selectedPost.feelPercentage) }]}>
                  {selectedPost.feelPercentage > 0 ? `+${selectedPost.feelPercentage}` : selectedPost.feelPercentage}
                </Text>
              </View>
            </View>
            <Text style={[styles.postDescriptionLarge, { color: theme.textSecondary }]}>
              {selectedPost.description}
            </Text>

            {/* Mood Shift Track Visualizer */}
            {renderMoodShiftTrack(selectedPost)}
          </View>

          {/* Comments List for Selected Post */}
          <Text style={[styles.commentsSectionTitle, { color: theme.text }]}>
            Comments ({(commentsByPost[selectedPost.id] || []).length})
          </Text>

          {(commentsByPost[selectedPost.id] || []).length === 0 ? (
            <View style={styles.emptyCommentsBox}>
              <Text style={[styles.noCommentsText, { color: theme.textTertiary }]}>
                No comments received on this post yet.
              </Text>
            </View>
          ) : (
            (commentsByPost[selectedPost.id] || []).map((comment) => {
              const baselineVal = selectedPost.feelPercentage ?? 0;
              const currentVal = comment.perspectiveRating !== undefined ? comment.perspectiveRating : baselineVal;
              return (
                <TouchableOpacity
                  key={comment.id}
                  activeOpacity={0.9}
                  onPress={() => setExpandedCommentId(prev => prev === comment.id ? null : comment.id)}
                  style={[styles.commentItem, { backgroundColor: theme.surface }]}
                >
                  <View style={{ flexDirection: 'row' }}>
                    <View style={styles.timelineLeftColumn}>
                      <Avatar seed={comment.commentorAvatar || comment.commentorName} size={36} />
                      <View style={[styles.timelineVerticalLine, { backgroundColor: theme.divider }]} />
                    </View>

                    <View style={styles.timelineRightColumn}>
                      <View style={styles.commentHeader}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.commentorName, { color: theme.text }]}>
                            {comment.commentorName}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.textTertiary }}>
                            • {formatTimestamp(comment.createdAt)}
                          </Text>
                        </View>
                        {ratingFeedback[comment.id] && (
                          <View style={styles.savedBadge}>
                            <Text style={styles.savedBadgeText}>{ratingFeedback[comment.id]}</Text>
                          </View>
                        )}
                        <Ionicons
                          name={expandedCommentId === comment.id ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={theme.textTertiary}
                        />
                      </View>

                      <Text style={[styles.commentText, { color: theme.textSecondary }]}>
                        {comment.text}
                      </Text>

                      {expandedCommentId === comment.id && (
                        <View style={styles.ratingSection}>
                          <View style={[styles.reflectionNote, { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6' }]}>
                            <Ionicons name="bulb-outline" size={16} color={theme.text} style={{ marginRight: 8 }} />
                            <Text style={[styles.reflectionNoteText, { color: theme.textSecondary }]}>
                              How did this comment shift your perspective? Rate below.
                            </Text>
                          </View>

                          <View style={styles.ratingLabelRow}>
                            <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>
                              Perspective:
                            </Text>
                            <Text style={[styles.ratingValue, { color: getMoodColor(currentVal) }]}>
                              {currentVal === 0
                                ? "Neutral (0)"
                                : currentVal < 0
                                  ? `Negative (${currentVal})`
                                  : `Positive (+${currentVal})`}
                            </Text>
                          </View>

                          <Slider
                            style={styles.slider}
                            minimumValue={-100}
                            maximumValue={100}
                            step={5}
                            value={currentVal}
                            onSlidingComplete={(val) => handleRatingChange(selectedPost, comment, val)}
                            minimumTrackTintColor="#7986CB"
                            maximumTrackTintColor="#FFB74D"
                            thumbTintColor="#111827"
                          />

                          <View style={styles.ticksRow}>
                            <Text style={[styles.tickText, { color: theme.textTertiary }]}>-100</Text>
                            <Text style={[styles.tickText, { color: theme.textTertiary }]}>0</Text>
                            <Text style={[styles.tickText, { color: theme.textTertiary }]}>+100</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : activeTab === "posts" ? (
        // --- 2. POSTS LIST TAB ---
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Note box 1 */}
          <View style={[styles.staticNoteBox, { backgroundColor: theme.isDark ? '#374151' : '#F8F5FF', borderColor: theme.isDark ? '#4B5563' : '#E9D5FF' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="journal" size={16} color={theme.text} style={{ marginRight: 8 }} />
              <Text style={styles.staticNoteTitle}>Perspective Journals</Text>
            </View>
            <Text style={[styles.staticNoteText, { color: theme.textSecondary }]}>
              Below are the feelings you've shared. Tap any post to view replies and rate how comments shifted your perspective.
            </Text>
          </View>
          
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6' }]}>
                <Ionicons name="document-text-outline" size={48} color={theme.text} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Posts Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                When you post your feelings, they will appear here. Select a post to rate support received.
              </Text>
            </View>
          ) : (
            posts.map((post) => {
              const commentsCount = (commentsByPost[post.id] || []).length;
              const catColors = getCategoryColors(post.category, theme.isDark);
              const { current } = getPostInsights(post);
              
              const renderBackgroundBlob = (mood) => {
                const color = mood >= 0 ? (theme.isDark ? '#064E3B' : '#ECFDF5') : (theme.isDark ? '#7F1D1D' : '#FEF2F2');
                return (
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 160,
                    height: 160,
                    backgroundColor: color,
                    borderTopLeftRadius: 160,
                    zIndex: 0,
                  }} pointerEvents="none" />
                );
              };

              return (
                <TouchableOpacity
                  key={post.id}
                  style={[styles.postCard, { backgroundColor: theme.surface }]}
                  onPress={() => setSelectedPost(post)}
                  activeOpacity={0.9}
                >
                  <View style={[styles.cardLeftStrip, { backgroundColor: current >= 0 ? '#10B981' : '#EF4444' }]} />
                  {renderBackgroundBlob(current)}
                  
                  <View style={styles.postCardContent}>
                    <View style={styles.postHeader}>
                      <Avatar seed={user.uid} size={50} />
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                          <View style={{ flex: 1, marginRight: 40 }}>
                            <Text style={[styles.postTitle, { color: current >= 0 ? '#10B981' : '#EF4444', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]} numberOfLines={2}>
                              {post.title}
                            </Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.metaText, { color: theme.text }]}>
                              {commentsCount}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 10 }}>
                          <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
                            <Text style={[styles.categoryText, { color: catColors.text }]}>
                              {getCategoryLabel(post.category)}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: theme.textTertiary, fontWeight: '600' }}>
                            {formatTimestamp(post.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.postDescription, { color: theme.textSecondary }]} numberOfLines={3}>
                      {post.description}
                    </Text>

                    <View style={[styles.divider, { backgroundColor: theme.divider }]} />

                    {/* MINI MOOD SHIFT TRACK */}
                    <View style={{ marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Text style={{ fontSize: 12, color: current >= 0 ? '#10B981' : '#EF4444', fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Perspective Shift
                        </Text>
                        {renderMoodIcon(current)}
                      </View>
                      {renderMoodShiftTrack(post, true)}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        // --- 3. INSIGHTS TAB ---
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* How Insights Work — static note box with doodles */}
          <View style={[styles.staticNoteBox, { backgroundColor: theme.isDark ? '#374151' : '#FFFBEB', borderColor: theme.isDark ? '#4B5563' : '#FDE68A' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="bulb" size={20} color={theme.text} style={{ marginRight: 8 }} />
              <Text style={styles.staticNoteTitle}>How Insights Work</Text>
            </View>
            <Text style={[styles.staticNoteText, { color: theme.textSecondary, marginBottom: 8 }]}>
              Whenever you share a post, we log your initial mood (-100 to +100). When others leave comments, go to the Posts tab, tap any post, and use the slider to rate how each comment shifted your perspective.
            </Text>
            <Text style={[styles.staticNoteText, { color: theme.textSecondary }]}>
              We then calculate your emotional shift to show how community support helps you grow! 🌱
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, { backgroundColor: theme.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.isDark ? '#3730A3' : '#EEF2FF' }]}>
                  <Ionicons name="document-text" size={16} color={theme.isDark ? '#818CF8' : '#6366F1'} />
                </View>
                <Text style={[styles.statVal, { color: theme.text }]} numberOfLines={1}>{posts.length}</Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>POSTS SHARED</Text>
            </View>

            <View style={[styles.statItem, { backgroundColor: theme.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.isDark ? '#7F1D1D' : '#FCEEEE' }]}>
                  <Ionicons name="trending-up" size={16} color={theme.isDark ? '#F87171' : '#EF5350'} />
                </View>
                <Text style={[styles.statVal, { color: avgShift >= 0 ? (theme.isDark ? '#F87171' : '#EF5350') : (theme.isDark ? '#F87171' : '#EF5350') }]} numberOfLines={1}>
                  {avgShift >= 0 ? `+${avgShift}` : avgShift}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>AVG SHIFT</Text>
            </View>

            <View style={[styles.statItem, { backgroundColor: theme.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.isDark ? '#064E3B' : '#E9F7EF' }]}>
                  <Ionicons name="star" size={16} color={theme.isDark ? '#34D399' : '#4CAF50'} />
                </View>
                <Text style={[styles.statVal, { color: theme.text }]} numberOfLines={1}>
                  {Object.values(commentsByPost).flat().filter(c => c.perspectiveRating !== undefined).length}
                </Text>
              </View>
              <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>RATED</Text>
            </View>
          </View>

          {/* Post Insights Breakdown */}
          <Text style={[styles.commentsSectionTitle, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase', fontSize: 16, marginTop: 16, marginBottom: 16 }]}>
            Post-by-Post Insights
          </Text>

          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.isDark ? '#374151' : '#F3F4F6' }]}>
                <Ionicons name="analytics-outline" size={48} color={theme.text} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Insights Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Create your first post and receive support comments to see perspective insights!
              </Text>
            </View>
          ) : (
            posts.map((post) => {
              const { initial, current, shift, bestComment, hasComments, hasRatedComments } = getPostInsights(post);
              const postComments = commentsByPost[post.id] || [];
              const ratedCount = postComments.filter(c => c.perspectiveRating !== undefined).length;
              const catColors = getCategoryColors(post.category, theme.isDark);
              
              const renderBackgroundBlob = (mood) => {
                const color = mood >= 0 ? (theme.isDark ? '#064E3B' : '#ECFDF5') : (theme.isDark ? '#7F1D1D' : '#FEF2F2');
                return (
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 140,
                    height: 140,
                    backgroundColor: color,
                    borderTopLeftRadius: 140,
                    zIndex: 0,
                  }} pointerEvents="none" />
                );
              };

              return (
                <View key={post.id} style={[styles.postCard, { backgroundColor: theme.surface }]}>
                  <View style={[styles.cardLeftStrip, { backgroundColor: current >= 0 ? '#10B981' : '#EF4444' }]} />
                  {renderBackgroundBlob(current)}
                  
                  <View style={styles.postCardContent}>
                    <View style={styles.postHeader}>
                      <Avatar seed={user.uid} size={50} />
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                          <View style={{ flex: 1, marginRight: 40 }}>
                            <Text style={[styles.postTitle, { color: current >= 0 ? '#10B981' : '#EF4444', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]} numberOfLines={2}>
                              {post.title}
                            </Text>
                          </View>
                          <View style={styles.metaItem}>
                            <Ionicons name="chatbubble-outline" size={16} color={theme.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.metaText, { color: theme.text }]}>
                              {postComments.length}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 10 }}>
                          <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
                            <Text style={[styles.categoryText, { color: catColors.text }]}>
                              {getCategoryLabel(post.category)}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: theme.textTertiary, fontWeight: '600' }}>
                            {formatTimestamp(post.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={{ marginTop: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Text style={{ fontSize: 12, color: current >= 0 ? '#10B981' : '#EF4444', fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Perspective Shift
                        </Text>
                        {renderMoodIcon(current)}
                      </View>
                      {renderMoodShiftTrack(post, true)}
                    </View>

                    <View style={[styles.divider, { backgroundColor: theme.divider }]} />

                    <View style={[styles.journeyBox, { backgroundColor: theme.isDark ? '#374151' : '#F8F5FF' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Ionicons name="heart-circle" size={20} color={theme.text} />
                        <Text style={[styles.journeyLabel, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase' }]}>Your Emotional Journey</Text>
                      </View>
                      {postComments.length === 0 ? (
                        <Text style={[styles.journeyText, { color: theme.textSecondary }]}>
                          You shared this feeling at <Text style={{ fontWeight: '800', color: getMoodColor(initial) }}>{initial > 0 ? `+${initial}` : initial}</Text>. When people comment, open the Posts tab, tap this post, and rate each comment to track how they shift your perspective.
                        </Text>
                      ) : (
                        <Text style={[styles.journeyText, { color: theme.textSecondary }]}>
                          You started at <Text style={{ fontWeight: '800', color: getMoodColor(initial) }}>{initial > 0 ? `+${initial}` : initial}</Text>. After rating <Text style={{ fontWeight: '800', color: theme.text }}>{ratedCount === 0 ? postComments.length : ratedCount} COMMENTS</Text>, your perspective moved to <Text style={{ fontWeight: '800', color: getMoodColor(current) }}>{current > 0 ? `+${current}` : current}</Text>. 
                          {shift > 0 ? " Community support helped lift your spirits! 🌟" : shift < 0 ? " You reflected on the feedback and processed your feelings. 🌧️" : " Your perspective remained steady after reflecting. ⚖️"}
                        </Text>
                      )}
                    </View>

                    {hasRatedComments && bestComment && (
                      <View style={{ marginTop: 20 }}>
                        <Text style={[styles.insightLabel, { color: theme.textTertiary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>MOST IMPACTFUL COMMENT</Text>
                        <View style={[styles.insightQuoteBox, { backgroundColor: theme.isDark ? '#1F2937' : '#F9FAFB' }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <Avatar seed={bestComment.commentorAvatar || bestComment.commentorName} size={28} />
                            <Text style={[styles.insightQuoteAuthor, { color: theme.text }]} numberOfLines={1}>{bestComment.commentorName}</Text>
                            <View style={[styles.shiftIndicator, { backgroundColor: theme.isDark ? '#064E3B' : '#E8F5E9' }]}>
                              <Text style={[styles.shiftIndicatorText, { color: theme.isDark ? '#34D399' : '#4CAF50' }]}>
                                {bestComment.perspectiveRating > initial ? `+${bestComment.perspectiveRating - initial} SHIFT` : 'NEUTRAL'}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.insightQuoteText, { color: theme.textSecondary }]} numberOfLines={3}>&ldquo;{bestComment.text}&rdquo;</Text>
                        </View>
                      </View>
                    )}

                    {!hasComments && (
                      <View style={styles.insightNotice}>
                        <Ionicons name="chatbubbles-outline" size={16} color={theme.textTertiary} />
                        <Text style={[styles.insightNoticeText, { color: theme.textTertiary }]}>No comments yet — share this post to receive community support!</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  tabBarContainer: {
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    width: '100%',
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    gap: 10,
  },
  activeTabItem: {
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: "#8B5CF6",
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 20,
    paddingBottom: 60,
  },
  selectedPostContainer: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  postTitleLarge: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
    lineHeight: 24,
  },
  moodBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginLeft: 12,
  },
  moodText: {
    fontSize: 15,
    fontWeight: "800",
  },
  postDescriptionLarge: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  postDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: -0.2,
    paddingHorizontal: 20,
  },
  emptyCommentsBox: {
    paddingVertical: 30,
    alignItems: "center",
  },
  noCommentsText: {
    fontSize: 15,
    fontStyle: "italic",
    paddingVertical: 10,
  },
  commentItem: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  commentorName: {
    fontSize: 15,
    fontWeight: "700",
  },
  savedBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  savedBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  ratingSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  ratingLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  slider: {
    width: "100%",
    height: 40,
    ...Platform.select({
      web: { outlineStyle: "none" },
    }),
  },
  ticksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    marginTop: -4,
  },
  tickText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  postCard: {
    borderRadius: 15,
    marginBottom: 10,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  postCardContent: {
    padding: 24,
  },
  cardLeftStrip: {
    position: 'absolute',
    left: 0,
    top: 24,
    bottom: 24,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    zIndex: 5,
  },
  timelineCommentItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: 16,
    width: 36,
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    marginTop: 10,
    alignSelf: 'center',
    borderRadius: 1,
  },
  timelineRightColumn: {
    flex: 1,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 14,
    fontWeight: "800",
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  staticNoteBox: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  staticNoteTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  staticNoteText: {
    fontSize: 13,
    lineHeight: 20,
  },
  moodTrackContainer: {
    marginTop: 12,
  },
  moodTrackLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  moodLabelGroup: {
    flexDirection: 'column',
  },
  moodTrackLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  moodTrackVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  moodTrackConnector: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
  },
  moodPoint: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    top: -4,
    marginLeft: -7,
  },
  moodTrackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  moodShiftText: {
    fontSize: 13,
    fontWeight: '700',
  },
  miniTrackContainer: {
    marginTop: 6,
  },
  miniTrackBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
    marginVertical: 6,
  },
  moodTrackLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 3,
  },
  miniMoodPoint: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    top: -4,
    marginLeft: -7,
  },
  miniTrackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  miniTrackText: {
    fontSize: 12,
    fontWeight: '800',
  },
  reflectionNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  reflectionNoteText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    flexDirection: 'column',
    padding: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  journeyBox: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  journeyLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  journeyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  insightLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  insightQuoteBox: {
    padding: 16,
    borderRadius: 20,
  },
  insightQuoteAuthor: {
    fontSize: 14,
    fontWeight: "800",
  },
  insightQuoteText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: "italic",
    marginTop: 8,
  },
  shiftIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  shiftIndicatorText: {
    fontSize: 11,
    fontWeight: "800",
  },
  insightNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 10,
  },
  insightNoticeText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  stickerDoodleContainer: {
    position: 'absolute',
    right: 24,
    top: 24,
    zIndex: 10,
  }
});
