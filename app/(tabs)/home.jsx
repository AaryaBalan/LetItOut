import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs, limit, startAfter, onSnapshot, orderBy, query } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Avatar from "../../components/Avatar";
import FilterModal from "../../components/FilterModal";
import Loading from "../../components/Loading";
import PostCard from "../../components/PostCard";
import TabScreenWrapper from "../../components/TabScreenWrapper";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTabBar } from "../../context/TabBarContext";
import { useAlert } from "../../context/AlertContext";
import { useTheme } from "../../context/ThemeContext";

const getCategoryTheme = (category, isDark) => {
  const themes = {
    "All Feed": { color: isDark ? "#FFFFFF" : "#FFFFFF", bgColor: isDark ? "#333333" : "#111827" },
    "Family": { color: isDark ? "#8AB4F8" : "#3B82F6", bgColor: isDark ? "#1A2A3A" : "#EBF3FE" },
    "Stress": { color: isDark ? "#F28B82" : "#EF4444", bgColor: isDark ? "#3A1A1A" : "#FCEEEE" },
    "Relationship": { color: isDark ? "#F8BBD0" : "#F59E0B", bgColor: isDark ? "#3A3A3A" : "#FEF9E6" },
    "Study": { color: isDark ? "#81C995" : "#10B981", bgColor: isDark ? "#1A3A2A" : "#E9F7EF" },
    "Mental Health": { color: isDark ? "#FDD663" : "#8B5CF6", bgColor: isDark ? "#1A1A3A" : "#EEF2FF" },
    "Other": { color: isDark ? "#E8EAED" : "#A78BFA", bgColor: isDark ? "#2A2A2A" : "#3C4043" }
  };
  return themes[category] || themes["Other"];
};

const getCategoryIcon = (category) => {
  switch (category) {
    case "Other": return <MaterialCommunityIcons name="ghost-outline" size={14} color="#A78BFA" />;
    case "Stress": return <Ionicons name="sad-outline" size={14} color="#EF4444" />;
    case "Study Support":
    case "Study": return <Ionicons name="school-outline" size={14} color="#10B981" />;
    case "Family": return <Ionicons name="people-outline" size={14} color="#3B82F6" />;
    case "Mental Health": return <Ionicons name="heart-outline" size={14} color="#8B5CF6" />;
    case "Relationship": return <Ionicons name="flower-outline" size={14} color="#F59E0B" />;
    default: return null;
  }
};

  function getTimeAgo(timestamp) {
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

    const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    if (isNaN(postDate.getTime())) return "Just now";

    const now = new Date();
    const diffInMs = now - postDate;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${diffInWeeks}w ago`;
    if (diffInDays < 365) return `${diffInMonths}mon ago`;
    return `${diffInYears}yr ago`;
  };

export default function Home() {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const { theme, toggleTheme, isDark } = useTheme();
  const router = useRouter();
  const lastOffsetY = useRef(0);
  const { showTabBar, hideTabBar } = useTabBar();
  const insets = useSafeAreaInsets();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [drawerSlideAnim] = useState(() => new Animated.Value(-400));
  const [backdropOpacityAnim] = useState(() => new Animated.Value(0));

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      drawerSlideAnim.setValue(-400);
      backdropOpacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(drawerSlideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isDrawerOpen, drawerSlideAnim, backdropOpacityAnim]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(drawerSlideAnim, {
        toValue: -400,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsDrawerOpen(false);
    });
  }, [drawerSlideAnim, backdropOpacityAnim]);
  const [selectedCategory, setSelectedCategory] = useState("All Feed");
  const [searchQuery, setSearchQuery] = useState("");
  const [firebasePosts, setFirebasePosts] = useState([]);
  const [olderPosts, setOlderPosts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageCursor = useRef(null);
  const paging = useRef(false);
  const loadMore = async () => {
    if (!hasMore || paging.current || !pageCursor.current) return;
    paging.current = true;
    setLoadingMore(true);
    try {
      const page = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(pageCursor.current), limit(20)));
      if (page.docs.length) pageCursor.current = page.docs[page.docs.length - 1];
      setOlderPosts(previous => [...previous, ...page.docs.map(d => ({ ...d.data(), id: d.id, timestamp: getTimeAgo(d.data().createdAt), createdAtDate: new Date(d.data().createdAt?.seconds ? d.data().createdAt.seconds * 1000 : d.data().createdAt) }))]);
      setHasMore(page.size === 20);
    } catch { showAlert("Could not load more posts", "Check your connection and try again."); }
    finally { paging.current = false; setLoadingMore(false); }
  };
  const [loading, setLoading] = useState(true);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [translateYHeader] = useState(() => new Animated.Value(0));
  const headerHidden = useRef(false);

  const showHeader = useCallback(() => {
    if (!headerHidden.current) return;
    headerHidden.current = false;
    Animated.timing(translateYHeader, {
      toValue: 0,
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true }).start();
  }, [translateYHeader]);

  const hideHeader = useCallback(() => {
    if (headerHidden.current) return;
    headerHidden.current = true;
    Animated.timing(translateYHeader, {
      toValue: -220,
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true }).start();
  }, [translateYHeader]);

  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState("recent");
  const [selectedFilter, setSelectedFilter] = useState("latest");
  const [selectedMood, setSelectedMood] = useState(null);
  const [showAnonymousOnly, setShowAnonymousOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0]; // Start off-screen

  useEffect(() => {
    if (refreshing) {
      // Reset and animate in
      slideAnim.setValue(-100);
      Animated.spring(slideAnim, {
        toValue: 100, // Target position
        useNativeDriver: true,
        friction: 6,
        tension: 40 }).start();
    }
  }, [refreshing, slideAnim]);

  const onRefresh = async () => {
    if (refreshing || paging.current) return;
    setRefreshing(true);
    try {
      const page = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20)));
      setFirebasePosts(page.docs.map(d => ({ ...d.data(), id: d.id,
        timestamp: getTimeAgo(d.data().createdAt),
        createdAtDate: new Date(d.data().createdAt?.seconds ? d.data().createdAt.seconds * 1000 : d.data().createdAt)
      })));
      setOlderPosts([]);
      pageCursor.current = page.docs[page.docs.length - 1] || null;
      setHasMore(page.size === 20);
    } catch { showAlert("Refresh failed", "Check your connection and try again."); }
    finally { setRefreshing(false); }
  };

  const categories = [
    "All Feed",
    "Stress",
    "Family",
    "Mental Health",
    "Study",
    "Relationship",
    "Other"
  ];

  // Fetch posts from Firebase in real-time
  useEffect(() => {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"), limit(20));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedPosts = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            description: data.description,
            category: data.category,
            timestamp: data.createdAt
              ? getTimeAgo(data.createdAt)
              : "Just now",
            createdAtDate: data.createdAt ? new Date(data.createdAt?.seconds ? data.createdAt.seconds * 1000 : data.createdAt) : new Date(),
            reactions: data.reactions || { support: 0, hug: 0 },
            reactionCount: data.reactionCount || 0,
            comments: data.comments || [],
            commentCount: data.comments?.length || 0,
            isAnonymous: data.isAnonymous,
            authorName: data.authorName || "Anonymous",
            authorId: data.authorId,
            feelPercentage: data.feelPercentage,
            helpNeeded: data.helpNeeded };
        });
        if (!pageCursor.current) {
          pageCursor.current = snapshot.docs[snapshot.docs.length - 1] || null;
          setHasMore(snapshot.size === 20);
        }
        setFirebasePosts(fetchedPosts);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching posts:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Ensure header and tab bar are visible on mount
  useEffect(() => {
    showHeader();
    showTabBar();
  }, [showHeader, showTabBar]);

  // Show header and tab bar if search is expanded
  useEffect(() => {
    if (isSearchExpanded) {
      showHeader();
      showTabBar();
    }
  }, [isSearchExpanded, showHeader, showTabBar]);



  // Helper function to calculate time ago


  // Combine Firebase posts with dummy data
  const allPosts = [...new Map([...olderPosts, ...firebasePosts].map(post => [post.id, post])).values()];

  const filteredPosts = allPosts.filter((post) => {
    // 1. Filter by category
    const matchesCategory =
      selectedCategory === "All Feed" ||
      post.category.toLowerCase().includes(selectedCategory.toLowerCase());

    // 2. Filter by search query
    const matchesSearch =
      searchQuery.trim() === "" ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase());

    // 3. Filter by Anonymous Only
    const matchesAnonymous = !showAnonymousOnly || post.isAnonymous;

    // 4. Filter by Mood
    let matchesMood = true;
    if (selectedMood === "depression") {
      matchesMood = (post.feelPercentage ?? 0) < 0;
    } else if (selectedMood === "happiness") {
      matchesMood = (post.feelPercentage ?? 0) >= 0;
    }

    return matchesCategory && matchesSearch && matchesAnonymous && matchesMood;
  }).sort((a, b) => {
    // 5. Handling "Help Needed" Filter
    if (selectedFilter === "help") {
      if (a.helpNeeded && !b.helpNeeded) return -1;
      if (!a.helpNeeded && b.helpNeeded) return 1;
    }

    // 6. Sorting
    if (selectedSort === "popular") {
      return (b.reactionCount || 0) - (a.reactionCount || 0);
    }
    if (selectedSort === "mostCommented") {
      return (b.commentCount || 0) - (a.commentCount || 0);
    }
    // Default: recent (createdAtDate)
    const dateA = a.createdAtDate || new Date(0);
    const dateB = b.createdAtDate || new Date(0);
    return dateB - dateA;
  });

  return (
    <TabScreenWrapper>
      <View style={[styles.container, { backgroundColor: theme.background }]}>

        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            transform: [{ translateY: translateYHeader }],
            backgroundColor: theme.background,
            borderBottomWidth: isSearchExpanded ? 1 : 0,
            borderBottomColor: theme.border,
            paddingTop: insets.top }}
        >
          <View style={[styles.header, { backgroundColor: theme.background }]}>
            {isSearchExpanded ? (
              <View style={styles.expandedWrapper}>
                <View style={[styles.expandedSearchBar, { backgroundColor: theme.input, borderColor: theme.border }]}>
                  <Ionicons name="search" size={18} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.expandedSearchInput, { color: theme.text }]}
                    placeholder="Search feed..."
                    placeholderTextColor={theme.placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.searchIconButton, { backgroundColor: theme.input }]}
                  onPress={() => setFilterModalVisible(true)}
                  delayPressIn={0}
                >
                  <Ionicons name="options-outline" size={18} color={theme.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setSearchQuery("");
                    setIsSearchExpanded(false);
                  }}
                  delayPressIn={0}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.headerLeft}>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: theme.input }]}
                    onPress={openDrawer}
                    delayPressIn={0}
                  >
                    <Ionicons name="menu-outline" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.logoContainerCenter}>
                  <Text style={[styles.logo, { color: theme.text }]}>Let It Out</Text>
                  <Ionicons name="sparkles-outline" size={16} color="#A78BFA" style={{ marginLeft: 2, marginTop: -10 }} />
                </View>

                <View style={styles.headerRight}>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: theme.input }]}
                    onPress={() => router.push('/notifications')}
                    delayPressIn={0}
                  >
                    <Ionicons
                      name="heart-outline"
                      size={22}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Categories Row inside sticky header item */}
          <View style={{ paddingBottom: 12, paddingTop: 4, backgroundColor: theme.background }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContent}
              keyboardShouldPersistTaps="always"
            >
              {(selectedSort !== "recent" ||
                selectedFilter !== "latest" ||
                selectedMood !== null ||
                showAnonymousOnly) && (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: theme.isDark ? '#2E224D' : '#EFE8FF',
                      gap: 6,
                      borderWidth: 1,
                      borderColor: theme.border,
                      marginRight: 6,
                      marginLeft: 16 }}
                    onPress={() => {
                      setSelectedSort("recent");
                      setSelectedFilter("latest");
                      setSelectedMood(null);
                      setShowAnonymousOnly(false);
                    }}
                    delayPressIn={0}
                  >
                    <Ionicons name="close-circle" size={16} color={theme.text} />
                    <Text style={{ fontSize: 12, fontFamily: 'Fredoka-Bold',  color: theme.text }}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}

              {/* Search Button in front of labels */}
              <TouchableOpacity
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.input,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8,
                  marginLeft: (selectedSort !== "recent" || selectedFilter !== "latest" || selectedMood !== null || showAnonymousOnly) ? 0 : 16
                }}
                onPress={() => setIsSearchExpanded(true)}
                delayPressIn={0}
              >
                <Ionicons name="search-outline" size={18} color={theme.text} />
              </TouchableOpacity>

              {categories.map((category) => {
                const catTheme = getCategoryTheme(category, theme.isDark);
                const isActive = selectedCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: theme.card, borderColor: 'transparent', borderWidth: 0, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
                      isActive && {
                        backgroundColor: catTheme.bgColor,
                        elevation: 0 },
                    ]}
                    onPress={() => setSelectedCategory(category)}
                    delayPressIn={0}
                  >
                    {category !== "All Feed" && getCategoryIcon(category)}
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: category === "All Feed" && isActive ? "#FFFFFF" : theme.textSecondary },
                        isActive && category !== "All Feed" && {
                          color: catTheme.color,
                          fontFamily: 'Fredoka-Bold' },
                      ]}
                    >
                      {category === "All Feed" ? "All" : category}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>

        <FlatList
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          onScroll={(event) => {
            const currentOffsetY = event.nativeEvent.contentOffset.y;
            const diff = currentOffsetY - lastOffsetY.current;
            if (currentOffsetY <= 0) {
              showTabBar();
              showHeader();
            } else if (!isSearchExpanded) {
              if (diff > 15) {
                hideTabBar();
                hideHeader();
              } else if (diff < -15) {
                showTabBar();
                showHeader();
              }
            } else {
              showTabBar();
              showHeader();
            }
            lastOffsetY.current = currentOffsetY;
          }}
          scrollEventThrottle={16}
          data={filteredPosts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ height: 116 + insets.top }} />
          }
          ListFooterComponent={
            loading || loadingMore ? (
              <View style={styles.emptyContainer}>
                <Loading size="large" text="Loading posts..." />
              </View>
            ) : filteredPosts.length === 0 ? (
              <View style={[styles.emptyContainer, { marginTop: 60 }]}>
                <View style={{
                  width: 100,
                  height: 100,
                  backgroundColor: theme.isDark ? '#222' : '#F3F4F6',
                  borderRadius: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20 }}>
                  <Ionicons
                    name="telescope-outline"
                    size={48}
                    color="#111827"
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text, fontSize: 18, fontFamily: 'Fredoka-Bold',  marginBottom: 8 }]}>No matches found</Text>
                <Text style={[styles.emptySubtext, { color: theme.textSecondary, maxWidth: 280, textAlign: 'center', lineHeight: 20 }]}>
                  No matches in the posts loaded so far. Clear filters or load more posts.
                </Text>
                {hasMore && <TouchableOpacity onPress={loadMore} style={{ padding: 16 }}><Text style={{ color: theme.text }}>Load more posts</Text></TouchableOpacity>}
              </View>
            ) : hasMore ? <TouchableOpacity onPress={loadMore} style={{ padding: 20 }}><Text style={{ color: theme.text, textAlign: "center" }}>Load more posts</Text></TouchableOpacity> : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#00000000']}
              tintColor="transparent"
              progressBackgroundColor="#00000000"
              progressViewOffset={-1000}
              style={{ backgroundColor: 'transparent', opacity: 0 }}
            />
          }
        />

        {refreshing && (
          <Animated.View style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 9999,
            elevation: 9999,
            transform: [{ translateY: slideAnim }] }}>
            <Loading size="large" />
          </Animated.View>
        )}

        <FilterModal
          visible={filterModalVisible}
          onClose={() => setFilterModalVisible(false)}
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
          selectedSort={selectedSort}
          setSelectedSort={setSelectedSort}
          selectedMood={selectedMood}
          setSelectedMood={setSelectedMood}
          showAnonymousOnly={showAnonymousOnly}
          setShowAnonymousOnly={setShowAnonymousOnly}
        />

        {/* Side Drawer Modal */}
        <Modal
          animationType="none"
          transparent={true}
          visible={isDrawerOpen}
          onRequestClose={closeDrawer}
        >
          <View style={styles.drawerOverlay}>
            <Animated.View style={[styles.drawerBackdrop, { opacity: backdropOpacityAnim }]}>
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={closeDrawer}
              />
            </Animated.View>
            <Animated.View style={[styles.drawerContent, { backgroundColor: theme.surface, transform: [{ translateX: drawerSlideAnim }] }]}>
              {/* Drawer Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: theme.divider }]}>
                {user ? (
                  <>
                    <View style={styles.drawerAvatarContainer}>
                      <Avatar seed={user.profileCode || "anonymous"} size={50} />
                    </View>
                    <Text style={[styles.drawerName, { color: theme.text }]} numberOfLines={1}>
                      {user.displayName || "Anonymous"}
                    </Text>
                    <Text style={[styles.drawerEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                      {user.email}
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={[styles.drawerAvatarContainer, { backgroundColor: theme.isDark ? '#222' : '#F3F4F6', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="person" size={28} color={theme.textSecondary} />
                    </View>
                    <Text style={[styles.drawerName, { color: theme.text }]}>Welcome Guest</Text>
                  </>
                )}
              </View>

              {/* Drawer Menu Options */}
              <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeDrawer();
                  }}
                >
                  <Ionicons name="home-outline" size={22} color={theme.text} />
                  <Text style={[styles.drawerItemText, { color: theme.text }]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeDrawer();
                    router.push("/my-center");
                  }}
                >
                  <Ionicons name="heart-half-outline" size={22} color={theme.text} />
                  <Text style={[styles.drawerItemText, { color: theme.text }]}>My Center</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeDrawer();
                    router.push("/explore");
                  }}
                >
                  <Ionicons name="compass-outline" size={22} color={theme.text} />
                  <Text style={[styles.drawerItemText, { color: theme.text }]}>Explore</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => {
                    closeDrawer();
                    router.push("/notifications");
                  }}
                >
                  <Ionicons name="notifications-outline" size={22} color={theme.text} />
                  <Text style={[styles.drawerItemText, { color: theme.text }]}>Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={toggleTheme}
                >
                  <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={22} color={theme.text} />
                  <Text style={[styles.drawerItemText, { color: theme.text }]}>
                    {isDark ? "Light Mode" : "Dark Mode"}
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Drawer Footer */}
              {user && (
                <View style={[styles.drawerFooter, { borderTopColor: theme.divider }]}>
                  <TouchableOpacity
                    style={styles.logoutButton}
                    disabled={loggingOut}
                    onPress={async () => {
                      setLoggingOut(true);
                      try {
                          await logout();
                      } finally {
                          setLoggingOut(false);
                          closeDrawer();
                      }
                    }}
                  >
                    {loggingOut ? (
                      <ActivityIndicator size="small" color="#E57373" />
                    ) : (
                      <>
                        <Ionicons name="log-out-outline" size={22} color="#E57373" />
                        <Text style={styles.logoutText}>Logout</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </View>
        </Modal>
      </View>
    </TabScreenWrapper >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 12,
    position: 'relative' },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start' },
  headerRight: {
    width: 40,
    alignItems: 'flex-end' },
  logoContainerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    flexDirection: 'row' },
  logo: {
    fontSize: 22,

    letterSpacing: -0.5,
    fontFamily: 'Frederick' },
  iconButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18 },
  notificationIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    backgroundColor: '#FF5252',
    borderRadius: 4,
    width: 7,
    height: 7,
    borderWidth: 1,
    borderColor: '#FFFFFF' },
  stickyContainer: {
    paddingVertical: 8,
    paddingHorizontal: 5,
    marginBottom: 6 },
  categoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38 },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center' },
  expandedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%' },
  expandedSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 36,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2 },
  expandedSearchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    padding: 0,
    height: '100%',
    fontFamily: 'Fredoka-Regular' },
  cancelButton: {
    paddingHorizontal: 4 },
  cancelText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Fredoka-Regular' },
  categoriesContent: {
    gap: 8,
    alignItems: 'center' },
  categoryChip: {
    paddingHorizontal: 16,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    gap: 6 },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Fredoka-Regular' },
  feedContent: {
    paddingTop: 8,
    paddingBottom: 100 },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60 },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
    marginTop: 12,
    fontFamily: 'Fredoka-Regular' },
  emptyTitle: {
    textAlign: 'center',
    fontFamily: 'Frederick' },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Fredoka-Regular' },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row' },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  drawerContent: {
    width: '75%',
    maxWidth: 300,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 30 },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    fontFamily: 'Frederick' },
  drawerAvatarContainer: {
    marginBottom: 12 },
  drawerName: {
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 4,
    fontFamily: 'Fredoka-Regular' },
  drawerEmail: {
    fontSize: 13,
    fontFamily: 'Fredoka-Regular' },
  drawerMenu: {
    flex: 1,
    paddingVertical: 16 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16 },
  drawerItemText: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'Fredoka-Regular' },
  drawerFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16 },
  logoutText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#E57373',
    fontFamily: 'Fredoka-Regular' } });
