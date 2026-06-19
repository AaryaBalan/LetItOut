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

        // Sort posts in-memory by createdAt descending
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
            perspectiveRating: data.perspectiveRating, // Can be undefined initially
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

  // Handle saving rating and computing delta relative to the previous rating
  const handleRatingChange = async (post, comment, val) => {
    try {
      const initial = post.feelPercentage ?? 0;
      // Previous rating defaults to post feelPercentage if undefined
      const prevRating = comment.perspectiveRating !== undefined ? comment.perspectiveRating : initial;
      const delta = val - prevRating;

      // 1. Update rating in Firestore
      const commentRef = doc(db, "comments", comment.id);
      await updateDoc(commentRef, {
        perspectiveRating: val,
      });

      // 2. Create notification for the commenter using the delta rating (only if delta is not zero)
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

      // 3. Show a temporary save status feedback
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
      "Family": { bg: isDark ? "#EBF3FE" : "#EBF3FE", text: isDark ? "#8AB4F8" : "#2F80ED" },
      "Stress": { bg: isDark ? "#FCEEEE" : "#FCEEEE", text: isDark ? "#F28B82" : "#EB5757" },
      "Relationship": { bg: isDark ? "#FEF9E6" : "#FEF9E6", text: isDark ? "#F8BBD0" : "#F2C94C" },
      "Study": { bg: isDark ? "#E9F7EF" : "#E9F7EF", text: isDark ? "#81C995" : "#27AE60" },
      "Mental Health": { bg: isDark ? "#EEF2FF" : "#EEF2FF", text: isDark ? "#FDD663" : "#6366F1" },
      "Other": { bg: isDark ? "#3C4043" : "#F1F3F4", text: isDark ? "#E8EAED" : "#3C4043" },
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

  // Calculate cumulative score: starting mood + sum of all comment deltas relative to starting mood
  const getPostCumulativeScore = (post) => {
    const comments = commentsByPost[post.id] || [];
    const initial = post.feelPercentage ?? 0;

    const sumAdjusted = comments.reduce((acc, c) => {
      const rating = c.perspectiveRating !== undefined ? c.perspectiveRating : initial;
      const delta = rating - initial;
      return acc + delta;
    }, 0);

    const cumulative = initial + sumAdjusted;
    // Clamp cumulative mood score between -100 and 100
    return Math.max(-100, Math.min(100, cumulative));
  };


  // Custom visualizer for mood shift
  const renderMoodShiftTrack = (post, isMini = false) => {
    const initial = post.feelPercentage ?? 0;
    const current = getPostCumulativeScore(post);

    // Normalize -100..100 to 0%..100%
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
                backgroundColor: isImprovement ? '#4CAF50' : '#EF5350'
              }
            ]} />
            <View style={[styles.miniMoodPoint, { left: initialPct, backgroundColor: '#8B5CF6', zIndex: 1 }]} />
            <View style={[styles.miniMoodPoint, { left: currentPct, backgroundColor: isImprovement ? '#4CAF50' : '#EF5350', zIndex: 2 }]} />
          </View>
          <View style={styles.miniTrackLabels}>
            <Text style={[styles.miniTrackText, { color: '#6B7280' }]}>INITIAL: <Text style={{ color: '#6B7280' }}>{initial}</Text></Text>
            <Text style={[styles.miniTrackText, { color: isImprovement ? '#4CAF50' : '#EF5350' }]}>
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

          {/* Track Line Container */}
          <View style={{ height: 4, backgroundColor: theme.isDark ? '#2A2A2F' : '#E5E7EB', borderRadius: 2, position: 'relative', marginVertical: 8 }}>
            {/* Connector Line between Initial and Current */}
            <View style={[
              styles.moodTrackConnector,
              {
                left: delta >= 0 ? initialPct : currentPct,
                width: `${Math.abs(delta) / 2}%`,
                backgroundColor: isImprovement ? '#4CAF50' : '#F44336'
              }
            ]} />

            {/* Initial Mood Point */}
            <View style={[styles.moodPoint, { left: initialPct, backgroundColor: '#8B5CF6' }]} />

            {/* Current Mood Point */}
            <View style={[styles.moodPoint, { left: currentPct, backgroundColor: isImprovement ? '#4CAF50' : '#F44336', zIndex: 2 }]} />
          </View>

        <View style={styles.moodTrackInfoRow}>
          <Ionicons name={isImprovement ? "trending-up" : "trending-down"} size={16} color={isImprovement ? '#66BB6A' : '#E57373'} />
          <Text style={[styles.moodShiftText, { color: isImprovement ? '#66BB6A' : '#E57373' }]}>
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
          style={[styles.backButton, { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }]}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
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
        <TouchableOpacity style={[styles.settingsButton, { backgroundColor: '#F8F5FF' }]}>
          <Ionicons name="settings-outline" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      {!selectedPost && (
        <View style={[styles.tabBarContainer]}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === "posts" && styles.activeTabItem]}
              onPress={() => setActiveTab("posts")}
            >
              <Ionicons name="document-text-outline" size={18} color={activeTab === "posts" ? "#111827" : theme.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === "posts" ? "#111827" : theme.textSecondary }, activeTab === "posts" && styles.activeTabText]}>
                POSTS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === "insights" && styles.activeTabItem]}
              onPress={() => setActiveTab("insights")}
            >
              <Ionicons name="analytics-outline" size={18} color={activeTab === "insights" ? "#111827" : theme.textSecondary} />
              <Text style={[styles.tabText, { color: activeTab === "insights" ? "#111827" : theme.textSecondary }, activeTab === "insights" && styles.activeTabText]}>
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
                <View style={{ flexDirection: 'row', marginTop: 4, alignItems: 'center', gap: 8 }}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColors(selectedPost.category, theme.isDark).bg }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColors(selectedPost.category, theme.isDark).text }]}>
                      {getCategoryLabel(selectedPost.category)}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.textTertiary }}>
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
                  style={styles.timelineCommentItem}
                >
                  <View style={styles.timelineLeftColumn}>
                    <Avatar seed={comment.commentorAvatar || comment.commentorName} size={32} />
                    <View style={[styles.timelineVerticalLine, { backgroundColor: theme.divider }]} />
                  </View>

                  <View style={styles.timelineRightColumn}>
                    <View style={styles.commentHeader}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.commentorName, { color: theme.text }]}>
                          {comment.commentorName}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textTertiary }}>
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
                        <View style={[styles.reflectionNote, { backgroundColor: theme.isDark ? '#2C2A3A' : '#F3E5F5', borderColor: theme.border }]}>
                          <Ionicons name="bulb-outline" size={16} color="#111827" style={{ marginRight: 6 }} />
                          <Text style={[styles.reflectionNoteText, { color: theme.textSecondary }]}>
                            How did this comment shift your perspective or state of mind? Adjust the slider below.
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
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : activeTab === "posts" ? (
        // --- 2. POSTS LIST TAB ---
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Welcoming explanation card */}
          <View style={[styles.explanationCard, { backgroundColor: '#F8F5FF', overflow: 'hidden' }]}>
            {/* Background curly line decoration */}
            <View style={{ position: 'absolute', right: -20, bottom: -20, width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#A78BFA', opacity: 0.3 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 60, height: 60, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <Ionicons name="sparkles" size={14} color="#111827" style={{ position: 'absolute', top: 0, left: 0 }} />
                <View style={{ transform: [{ rotate: '-10deg' }], backgroundColor: '#A78BFA', padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#111827', alignItems: 'center', justifyContent: 'center' }}>
                   <Ionicons name="document-text" size={22} color="#FFFFFF" />
                </View>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 12 }}>
                <Text style={[styles.explanationTitle, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>PERSPECTIVE JOURNALS</Text>
                <Text style={[styles.explanationText, { color: theme.textSecondary }]}>
                  Below are the feelings you've shared. Click any post to view replies and rate how their comments shifted your perspective.
                </Text>
              </View>
              <View style={{ position: 'relative' }}>
                <Ionicons name="sparkles" size={16} color="#111827" style={{ position: 'absolute', top: -15, left: -15, opacity: 0.5 }} />
                <View style={[styles.explanationArrowCircle, { backgroundColor: '#6366F1' }]}>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              </View>
            </View>
          </View>
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.isDark ? '#222' : '#F3F4F6' }]}>
                <Ionicons name="document-text-outline" size={48} color="#111827" />
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
              
              // Helper to render playfully stylized background doodles based on mood
              const renderDoodle = (mood) => {
                let blobColor, iconColor, iconName;
                if (mood >= 0) {
                  blobColor = '#E8F5E9'; // Happy green
                  iconColor = '#81C784';
                  iconName = 'happy';
                } else {
                  blobColor = '#F3E5F5'; // Sad purple
                  iconColor = '#BA68C8';
                  iconName = 'sad';
                }

                return (
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 130,
                    height: 130,
                    backgroundColor: blobColor,
                    borderTopLeftRadius: 130,
                    justifyContent: 'flex-end',
                    alignItems: 'flex-end',
                    paddingBottom: 20,
                    paddingRight: 20,
                    zIndex: 0,
                  }} pointerEvents="none">
                    <Ionicons name={iconName} size={46} color={iconColor} style={{ opacity: 0.9 }} />
                  </View>
                );
              };

              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  onPress={() => setSelectedPost(post)}
                  activeOpacity={0.7}
                >
                  {renderDoodle(current)}
                  <View style={styles.postHeader}>
                    <Avatar seed={user.uid} size={48} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={[styles.postTitle, { color: catColors.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]} numberOfLines={2}>
                            {post.title}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="chatbubble-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                          <Text style={[styles.metaText, { color: "#111827", fontWeight: '700' }]}>
                            {commentsCount}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 8 }}>
                        <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
                          <Text style={[styles.categoryText, { color: catColors.text }]}>
                            {getCategoryLabel(post.category)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '800', textTransform: 'uppercase' }}>
                          {formatTimestamp(post.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.postDescription, { color: '#6B7280' }]} numberOfLines={3}>
                    {post.description}
                  </Text>

                  <View style={styles.divider} />

                  {/* MINI MOOD SHIFT TRACK */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '800', marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Perspective Shift Tracking
                    </Text>
                    {renderMoodShiftTrack(post, true)}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : (
        // --- 3. INSIGHTS TAB ---
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* How Insights Work */}
          <View style={[styles.insightsExplanationBox, { backgroundColor: '#F8F5FF' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={[styles.explanationIconCircle, { backgroundColor: '#FFFFFF', width: 40, height: 40, borderRadius: 20 }]}>
                <Ionicons name="bulb-outline" size={20} color="#111827" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.insightsTitle, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase' }]}>How Insights Work</Text>
                <Text style={[styles.insightsDescription, { color: '#6B7280', marginTop: 4 }]}>
                  Whenever you share a post, we log your initial mood (-100 to +100). When others leave comments, you can expand them in the "Posts" tab and use the slider to rate how they shifted your perspective.
                </Text>
                <Text style={[styles.insightsDescription, { color: '#6B7280', marginTop: 6 }]}>
                  We calculate your emotional shift to show how community support helps you transform negative feelings into positive clarity and growth!
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, { backgroundColor: '#FFFFFF' }]}>
              <View style={[styles.statIconCircle, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="document-text" size={18} color="#6366F1" />
              </View>
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={[styles.statVal, { color: "#111827" }]} numberOfLines={1}>{posts.length}</Text>
                <Text style={[styles.statLabel, { color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>POSTS SHARED</Text>
              </View>
            </View>

            <View style={[styles.statItem, { backgroundColor: '#FFFFFF' }]}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FCEEEE' }]}>
                <Ionicons name="trending-up" size={18} color="#EF5350" />
              </View>
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={[styles.statVal, { color: avgShift >= 0 ? '#66BB6A' : '#EF5350' }]} numberOfLines={1}>
                  {avgShift >= 0 ? `+${avgShift}` : avgShift}
                </Text>
                <Text style={[styles.statLabel, { color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>AVG PERSPECTIVE SHIFT</Text>
              </View>
            </View>

            <View style={[styles.statItem, { backgroundColor: '#FFFFFF' }]}>
              <View style={[styles.statIconCircle, { backgroundColor: '#E9F7EF' }]}>
                <Ionicons name="star" size={18} color="#4CAF50" />
              </View>
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={[styles.statVal, { color: "#111827" }]} numberOfLines={1}>
                  {Object.values(commentsByPost).flat().filter(c => c.perspectiveRating !== undefined).length}
                </Text>
                <Text style={[styles.statLabel, { color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>PERSPECTIVES RATED</Text>
              </View>
            </View>
          </View>

          {/* Post Insights Breakdown */}
          <Text style={[styles.commentsSectionTitle, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase', fontSize: 16, marginTop: 12 }]}>
            Post-by-Post Insights
          </Text>

          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.isDark ? '#222' : '#F3F4F6' }]}>
                <Ionicons name="analytics-outline" size={48} color="#111827" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Insights Yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Create your first post and receive support comments to see perspective insights!
              </Text>
            </View>
          ) : (
            posts.map((post) => {
              const { initial, current, bestComment, hasComments, hasRatedComments } = getPostInsights(post);
              const postComments = commentsByPost[post.id] || [];
              const ratedCount = postComments.filter(c => c.perspectiveRating !== undefined).length;
              const catColors = getCategoryColors(post.category, theme.isDark);
              
              const renderDoodle = (mood) => {
                let blobColor, iconColor, iconName;
                if (mood >= 0) {
                  blobColor = '#E8F5E9'; // Happy green
                  iconColor = '#81C784';
                  iconName = 'happy';
                } else {
                  blobColor = '#F3E5F5'; // Sad purple
                  iconColor = '#BA68C8';
                  iconName = 'sad';
                }

                return (
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 130,
                    height: 130,
                    backgroundColor: blobColor,
                    borderTopLeftRadius: 130,
                    justifyContent: 'flex-end',
                    alignItems: 'flex-end',
                    paddingBottom: 20,
                    paddingRight: 20,
                    zIndex: 0,
                  }} pointerEvents="none">
                    <Ionicons name={iconName} size={46} color={iconColor} style={{ opacity: 0.9 }} />
                  </View>
                );
              };

              return (
                <View key={post.id} style={styles.postCard}>
                  {renderDoodle(current)}
                  {/* Header */}
                  <View style={styles.postHeader}>
                    <Avatar seed={user.uid} size={48} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%' }}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={[styles.postTitle, { color: catColors.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]} numberOfLines={2}>
                            {post.title}
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="chatbubble-outline" size={14} color="#6B7280" style={{ marginRight: 4 }} />
                          <Text style={[styles.metaText, { color: "#111827", fontWeight: '700' }]}>
                            {postComments.length}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 8 }}>
                        <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
                          <Text style={[styles.categoryText, { color: catColors.text }]}>
                            {getCategoryLabel(post.category)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '800', textTransform: 'uppercase' }}>
                          {formatTimestamp(post.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Mood track */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '800', marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Perspective Shift Tracking
                    </Text>
                    {renderMoodShiftTrack(post, true)}
                  </View>

                  <View style={styles.insightDivider} />

                  {/* Emotional Journey narrative */}
                  <View style={[styles.journeyBox, { backgroundColor: '#F8F5FF' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Ionicons name="heart-circle" size={18} color="#111827" />
                      <Text style={[styles.journeyLabel, { color: '#111827', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', textTransform: 'uppercase', fontSize: 13, fontWeight: '800' }]}>Your Emotional Journey</Text>
                    </View>
                    {postComments.length === 0 ? (
                      <Text style={[styles.journeyText, { color: '#6B7280', lineHeight: 20 }]}>
                        You shared this feeling at <Text style={{ fontWeight: '800', color: getMoodColor(initial) }}>{initial > 0 ? `+${initial}` : initial}</Text>. When people comment, open the Posts tab, tap this post, and rate each comment to track how they shift your perspective.
                      </Text>
                    ) : ratedCount === 0 ? (
                      <Text style={[styles.journeyText, { color: '#6B7280', lineHeight: 20 }]}>
                        You started at <Text style={{ fontWeight: '800', color: getMoodColor(initial) }}>{initial > 0 ? `+${initial}` : initial}</Text>. After rating <Text style={{ fontWeight: '800', color: '#111827' }}>{postComments.length} COMMENTS</Text>, your perspective moved to <Text style={{ fontWeight: '800', color: getMoodColor(current) }}>{current > 0 ? `+${current}` : current}</Text>. Community support helped lift your spirits! 🌟
                      </Text>
                    ) : (
                      <Text style={[styles.journeyText, { color: '#6B7280', lineHeight: 20 }]}>
                        You started at <Text style={{ fontWeight: '800', color: getMoodColor(initial) }}>{initial > 0 ? `+${initial}` : initial}</Text>. After rating <Text style={{ fontWeight: '800', color: '#111827' }}>{ratedCount} COMMENTS</Text>, your perspective moved to <Text style={{ fontWeight: '800', color: getMoodColor(current) }}>{current > 0 ? `+${current}` : current}</Text>. Community support helped lift your spirits! 🌟
                      </Text>
                    )}
                  </View>

                  {/* Most impactful comment */}
                  {hasRatedComments && bestComment && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={[styles.insightLabel, { color: '#6B7280', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }]}>MOST IMPACTFUL COMMENT</Text>
                      <View style={[styles.insightQuoteBox, { backgroundColor: '#F9FAFB' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <Avatar seed={bestComment.commentorAvatar || bestComment.commentorName} size={24} />
                          <Text style={[styles.insightQuoteAuthor, { color: '#111827', textTransform: 'uppercase' }]} numberOfLines={1}>{bestComment.commentorName}</Text>
                          <View style={[styles.shiftIndicator, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={[styles.shiftIndicatorText, { color: '#4CAF50' }]}>
                              {bestComment.perspectiveRating > initial ? `+${bestComment.perspectiveRating - initial} SHIFT` : 'NEUTRAL'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.insightQuoteText, { color: '#6B7280' }]} numberOfLines={2}>&ldquo;{bestComment.text}&rdquo;</Text>
                      </View>
                    </View>
                  )}

                  {!hasComments && (
                    <View style={styles.insightNotice}>
                      <Ionicons name="chatbubbles-outline" size={15} color="#9CA3AF" />
                      <Text style={[styles.insightNoticeText, { color: '#9CA3AF', marginLeft: 6 }]}>No comments yet — share this post to receive community support!</Text>
                    </View>
                  )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  tabBarContainer: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    gap: 8,
  },
  activeTabItem: {
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: "#8B5CF6",
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 40,
  },
  selectedPostContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  postTitleLarge: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  postCategory: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  moodBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moodText: {
    fontSize: 13,
    fontWeight: "800",
  },
  postDescriptionLarge: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  postDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  commentsSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: -0.2,
    paddingHorizontal: 16,
  },
  emptyCommentsBox: {
    paddingVertical: 20,
    alignItems: "center",
  },
  noCommentsText: {
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  commentItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentorName: {
    fontSize: 13,
    fontWeight: "700",
  },
  savedBadge: {
    backgroundColor: "#66BB6A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  savedBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  ratingSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
  ratingLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  slider: {
    width: "100%",
    height: 30,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      },
    }),
  },
  ticksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginTop: -2,
  },
  tickText: {
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cardLeftStrip: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  timelineCommentItem: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  timelineLeftColumn: {
    alignItems: 'center',
    marginRight: 14,
    width: 36,
  },
  timelineVerticalLine: {
    width: 2,
    flex: 1,
    marginTop: 8,
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
    fontSize: 12,
    fontWeight: "700",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  postContextRow: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  postContextText: {
    fontSize: 11,
    fontWeight: "500",
  },

  // Custom Visualizer Styles
  moodTrackContainer: {
    marginTop: 8,
  },
  moodTrackLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moodLabelGroup: {
    flexDirection: 'column',
  },
  moodTrackLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  moodTrackVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  moodTrackBar: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    marginVertical: 12,
  },
  moodTrackConnector: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
  },
  moodPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    top: -3,
    marginLeft: -6,
  },
  moodTrackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  moodShiftText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Mini Track Styles
  miniTrackContainer: {
    marginTop: 4,
  },
  miniTrackBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
    marginVertical: 4,
  },
  moodTrackLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
  },
  miniMoodPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: -4,
    marginLeft: -6,
  },
  miniTrackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  miniTrackText: {
    fontSize: 11,
    fontWeight: '800',
  },
  reflectionNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  reflectionNoteText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  explanationCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  explanationIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  explanationArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 16,
  },
  insightsExplanationBox: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  insightsTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  insightsDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "700",
  },
  journeyBox: {
    padding: 16,
    borderRadius: 16,
  },
  insightDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginVertical: 12,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  insightQuoteBox: {
    padding: 12,
    borderRadius: 16,
  },
  insightQuoteAuthor: {
    fontSize: 12,
    fontWeight: "800",
  },
  insightQuoteText: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: "italic",
    marginTop: 4,
  },
  shiftIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shiftIndicatorText: {
    fontSize: 10,
    fontWeight: "800",
  },
  insightNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,

    gap: 8,
    paddingVertical: 6,
  },
  insightNoticeText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  journeyBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  journeyLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  journeyText: {
    fontSize: 12,
    lineHeight: 19,
  },
});
