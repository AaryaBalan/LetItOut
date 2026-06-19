import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Avatar from "../../components/Avatar";
import AvatarSelectionModal from "../../components/AvatarSelectionModal";
import EditProfileModal from "../../components/EditProfileModal";
import Loading from "../../components/Loading";
import PostCard from "../../components/PostCard";
import TabScreenWrapper from "../../components/TabScreenWrapper";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTabBar } from "../../context/TabBarContext";
import { useTheme } from "../../context/ThemeContext";

export default function Profile() {
  const router = useRouter();
  const { showTabBar } = useTabBar();
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  // Ensure tab bar is shown when entering the profile screen
  useEffect(() => {
    showTabBar();
  }, [showTabBar]);

  const [userPosts, setUserPosts] = useState([]);
  const [showAllStoriesModal, setShowAllStoriesModal] = useState(false);
  const [showAllHistoryModal, setShowAllHistoryModal] = useState(false);
  const [supportiveHistory, setSupportiveHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profileCode, setProfileCode] = useState(
    user?.profileCode || user?.email || "",
  );
  const [userProfile, setUserProfile] = useState(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [friendsListType, setFriendsListType] = useState('following');
  const [friendsList, setFriendsList] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]);
  const [showAllSavedModal, setShowAllSavedModal] = useState(false);

  // Listen to user profile changes in real-time
  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    setProfileCode(user.profileCode || user.email || "");

    // Set up real-time listener for user profile
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
        setLoadingProfile(false);
      },
      (error) => {
        console.error("Error listening to user profile:", error);
        setLoadingProfile(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleProfileUpdate = () => {
    // Profile updates automatically via real-time listener
    // This function is kept for compatibility with EditProfileModal
  };


  // Fetch Follow Counts
  useEffect(() => {
    if (!user) return;
    const friendsRef = collection(db, "friends");
    const followingQ = query(friendsRef, where("followerId", "==", user.uid));
    const followersQ = query(friendsRef, where("followingId", "==", user.uid));

    const unsubFollowing = onSnapshot(followingQ, (snap) => setFollowingCount(snap.size));
    const unsubFollowers = onSnapshot(followersQ, (snap) => setFollowersCount(snap.size));

    return () => { unsubFollowing(); unsubFollowers(); };
  }, [user]);

  const handleOpenFriends = async (type) => {
    setFriendsListType(type);
    setShowFriendsModal(true);
    setIsLoadingFriends(true);
    try {
      const q = query(
        collection(db, "friends"),
        where(type === 'following' ? "followerId" : "followingId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const userIds = snap.docs.map(doc => type === 'following' ? doc.data().followingId : doc.data().followerId);

      if (userIds.length > 0) {
        // Fetch users. For simplicity, fetching all users in parallel. 
        // In prod, chunking or an 'in' query is better.
        const userPromises = userIds.map(uid => getDoc(doc(db, "users", uid)));
        const userSnaps = await Promise.all(userPromises);
        const usersData = userSnaps
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() }));
        setFriendsList(usersData);
      } else {
        setFriendsList([]);
      }
    } catch (e) {
      console.error("Error fetching friends", e);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleAvatarSelect = async (newSeed) => {
    try {
      // Update profileCode in Firestore (creates document if it doesn't exist)
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        profileCode: newSeed,
        email: user.email,
        displayName: user.displayName || "Anonymous",
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setProfileCode(newSeed);
      Alert.alert("Success", "Profile image updated successfully!");
    } catch (error) {
      console.error("Error updating avatar:", error);
      Alert.alert("Error", "Failed to update profile image");
    }
  };

  // Fetch user's posts from Firebase
  useEffect(() => {
    if (!user) {
      setLoadingPosts(false);
      return;
    }

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
            category: data.category,
            description: data.description,
            createdAt: data.createdAt,
            reactions: { like: 0, hug: 0, metoo: 0 },
            reactionCount: data.reactionCount || 0,
          };
        });
        setUserPosts(fetchedPosts);
        setLoadingPosts(false);
      },
      (error) => {
        console.error("Error fetching user posts:", error);
        setLoadingPosts(false);
      },
    );

    return () => unsubscribe();
  }, [user]);

  // Fetch user's supportive history (reactions and comments) in real-time
  useEffect(() => {
    if (!user) {
      setLoadingHistory(false);
      return;
    }

    const unsubscribes = [];

    // Listen to user's reactions in real-time
    const reactionsRef = collection(db, "reactions");
    const reactionsQuery = query(
      reactionsRef,
      where("userId", "==", user.uid),
    );

    const reactionsUnsub = onSnapshot(
      reactionsQuery,
      async (reactionsSnapshot) => {
        const history = [];

        // Process reactions
        for (const doc of reactionsSnapshot.docs) {
          const data = doc.data();
          const postId = data.postId;

          // Fetch post details
          const postsRef = collection(db, "posts");
          const postQuery = query(
            postsRef,
            where("__name__", "==", postId),
          );
          const postSnapshot = await getDocs(postQuery);

          if (!postSnapshot.empty) {
            const postData = postSnapshot.docs[0].data();
            let actionText = "";
            if (data.type === "like") actionText = "Liked this story";
            else if (data.type === "hug")
              actionText = "Sent a hug to this";
            else if (data.type === "metoo")
              actionText = "You feel the same";

            history.push({
              id: doc.id,
              type: data.type,
              action: actionText,
              postId: postId,
              postTitle: postData.title,
              postCategory: postData.category,
              timestamp: data.createdAt || new Date().toISOString(),
            });
          }
        }

        // Fetch comments once to add to history
        const commentsRef = collection(db, "comments");
        const commentsQuery = query(
          commentsRef,
          where("commentorId", "==", user.uid),
        );
        const commentsSnapshot = await getDocs(commentsQuery);

        // Process comments
        for (const doc of commentsSnapshot.docs) {
          const data = doc.data();
          const postId = data.postId;

          // Fetch post details
          const postsRef = collection(db, "posts");
          const postQuery = query(
            postsRef,
            where("__name__", "==", postId),
          );
          const postSnapshot = await getDocs(postQuery);

          if (!postSnapshot.empty) {
            const postData = postSnapshot.docs[0].data();

            history.push({
              id: doc.id,
              type: "comment",
              action: "Commented on this story",
              postId: postId,
              postTitle: postData.title,
              postCategory: postData.category,
              comment: data.comment,
              timestamp: data.createdAt || new Date().toISOString(),
            });
          }
        }

        // Sort by timestamp (newest first)
        history.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );

        setSupportiveHistory(history);
        setLoadingHistory(false);
      },
    );

    unsubscribes.push(reactionsUnsub);

    // Listen to user's comments in real-time
    const commentsRef = collection(db, "comments");
    const commentsQuery = query(
      commentsRef,
      where("commentorId", "==", user.uid),
    );

    const commentsUnsub = onSnapshot(
      commentsQuery,
      async (commentsSnapshot) => {
        // Re-fetch reactions to combine with comments
        const reactionsRef = collection(db, "reactions");
        const reactionsQuery = query(
          reactionsRef,
          where("userId", "==", user.uid),
        );
        const reactionsSnapshot = await getDocs(reactionsQuery);

        const history = [];

        // Process reactions
        for (const doc of reactionsSnapshot.docs) {
          const data = doc.data();
          const postId = data.postId;

          // Fetch post details
          const postsRef = collection(db, "posts");
          const postQuery = query(
            postsRef,
            where("__name__", "==", postId),
          );
          const postSnapshot = await getDocs(postQuery);

          if (!postSnapshot.empty) {
            const postData = postSnapshot.docs[0].data();
            let actionText = "";
            if (data.type === "like") actionText = "Liked this story";
            else if (data.type === "hug")
              actionText = "Sent a hug to this";
            else if (data.type === "metoo")
              actionText = "You feel the same";

            history.push({
              id: doc.id,
              type: data.type,
              action: actionText,
              postId: postId,
              postTitle: postData.title,
              postCategory: postData.category,
              timestamp: data.createdAt || new Date().toISOString(),
            });
          }
        }

        // Process comments
        for (const doc of commentsSnapshot.docs) {
          const data = doc.data();
          const postId = data.postId;

          // Fetch post details
          const postsRef = collection(db, "posts");
          const postQuery = query(
            postsRef,
            where("__name__", "==", postId),
          );
          const postSnapshot = await getDocs(postQuery);

          if (!postSnapshot.empty) {
            const postData = postSnapshot.docs[0].data();

            history.push({
              id: doc.id,
              type: "comment",
              action: "Commented on this story",
              postId: postId,
              postTitle: postData.title,
              postCategory: postData.category,
              comment: data.comment,
              timestamp: data.createdAt || new Date().toISOString(),
            });
          }
        }

        // Sort by timestamp (newest first)
        history.sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
        );

        setSupportiveHistory(history);
        setLoadingHistory(false);
      },
    );

    unsubscribes.push(commentsUnsub);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user]);

  // Fetch saved posts
  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!user) {
        setLoadingSaved(false);
        return;
      }

      try {
        // Get user's saved posts array
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const savedPostIds = userDoc.data().savedPosts || [];

          if (savedPostIds.length === 0) {
            setSavedPosts([]);
            setLoadingSaved(false);
            return;
          }

          // Fetch each saved post
          const postsPromises = savedPostIds.map(async (postId) => {
            const postDoc = await getDoc(doc(db, "posts", postId));
            if (postDoc.exists()) {
              return { id: postDoc.id, ...postDoc.data() };
            }
            return null;
          });

          const posts = await Promise.all(postsPromises);
          const validPosts = posts.filter(post => post !== null);
          setSavedPosts(validPosts);
        } else {
          setSavedPosts([]);
        }
      } catch (error) {
        console.error("Error fetching saved posts:", error);
      } finally {
        setLoadingSaved(false);
      }
    };

    fetchSavedPosts();
  }, [user]);

  const getTimeAgo = (timestamp) => {
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

  const getHistoryCardTextColor = (type) => {
    if (type === "like") return "#F06292"; // Pink
    if (type === "hug") return "#FFB74D"; // Orange/Yellow
    if (type === "metoo") return "#66BB6A"; // Green
    if (type === "comment") return "#111827"; // Violet
    return "#FFB74D";
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          const result = await logout();
          if (result.success) {
            router.replace("/");
          } else {
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  const handlePrivacySettings = () => {
    Alert.alert(
      "Privacy Settings",
      "Privacy settings will be implemented soon",
    );
  };

  const handleDeactivateAccount = () => {
    Alert.alert(
      "Deactivate Account",
      "Are you sure you want to deactivate your account? This action can be reversed by logging in again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive" },
      ],
    );
  };

  const formatJoinDate = (timestamp) => {
    if (!timestamp) return "October 2023";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const formatMemberSince = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />
        <View style={[styles.notLoggedInContainer, { backgroundColor: theme.background }]}>
          <Ionicons
            name="person-circle-outline"
            size={80}
            color={theme.textTertiary}
          />
          <Text style={[styles.notLoggedInTitle, { color: theme.text }]}>Not Logged In</Text>
          <Text style={[styles.notLoggedInText, { color: theme.textSecondary }]}>
            Please log in to view your profile
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  const isPageLoading = loadingProfile || loadingPosts || loadingHistory || loadingSaved;

  if (isPageLoading) {
    return (
      <TabScreenWrapper>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]} edges={["top"]}>
          <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />
          <Loading size="large" color={theme.isDark ? '#B39DDB' : '#111827'} />
          <Text style={{ marginTop: 16, color: theme.textSecondary, fontSize: 14, fontWeight: '600' }}>
            Loading Profile...
          </Text>
        </SafeAreaView>
      </TabScreenWrapper>
    );
  }
  const joinDate = user.metadata?.creationTime
    ? formatJoinDate(user.metadata.creationTime)
    : user.createdAt
      ? formatJoinDate(user.createdAt)
      : "October 2023";

  const memberSince = user.metadata?.creationTime
    ? formatMemberSince(user.metadata.creationTime)
    : user.createdAt
      ? formatMemberSince(user.createdAt)
      : "N/A";

  return (
    <TabScreenWrapper>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
        <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.divider }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Your Profile</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={[styles.scrollView, { backgroundColor: theme.background }]}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: theme.background, paddingBottom: 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: theme.surface }]}>
            {/* Horizontal Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Avatar seed={profileCode} size={80} />
                <TouchableOpacity
                  style={styles.editAvatarButton}
                  onPress={() => setShowAvatarModal(true)}
                >
                  <Ionicons name="pencil" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <Text style={[styles.username, { color: theme.text }]}>
                  {user.displayName || "Anonymous User"}
                </Text>
                <Text style={[styles.joinDate, { color: theme.textSecondary }]}>Joined {joinDate}</Text>
              </View>

              {/* Edit Profile Button */}
              <TouchableOpacity
                style={[styles.editProfileButtonCompact, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F3E5F5' }]}
                onPress={() => setShowEditModal(true)}
              >
                <Ionicons name="create-outline" size={20} color="#8B5CF6" />
              </TouchableOpacity>
            </View>

            {/* Bio */}
            {userProfile?.bio && (
              <Text style={[styles.bio, { color: theme.text }]}>{userProfile.bio}</Text>
            )}

            {/* Additional Info */}
            <View style={[styles.infoSection, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9F9F9' }]}>
              <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={16} color={theme.textSecondary} />
                <Text style={[styles.infoText, { color: theme.text }]}>{user.email}</Text>
              </View>
              {userProfile?.phoneNumber && (
                <View style={styles.infoItem}>
                  <Ionicons
                    name="call-outline"
                    size={16}
                    color={theme.textSecondary}
                  />
                  <Text style={[styles.infoText, { color: theme.text }]}>
                    {userProfile.phoneNumber}
                  </Text>
                </View>
              )}
              <View style={styles.infoItem}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color="#6B7280"
                />
                <Text style={styles.infoText}>
                  {user.displayName || "Anonymous"}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color="#6B7280"
                />
                <Text style={styles.infoText}>
                  Member since {memberSince}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
              {/* Love Sent Card */}
              <View style={[styles.statCardHorizontal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.isDark ? '#2A1A2E' : '#FEF9E6' }]}>
                  <Ionicons name="heart" size={20} color="#EC4899" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={[styles.statNumber, { color: theme.text }]}>{userProfile?.loveSent || 0}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Love Sent</Text>
                </View>
              </View>

              {/* Stories Card */}
              <View style={[styles.statCardHorizontal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.isDark ? '#1E1B2E' : '#EDE7F6' }]}>
                  <Ionicons name="book" size={20} color="#111827" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={[styles.statNumber, { color: theme.text }]}>{userProfile?.postCount || 0}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Stories</Text>
                </View>
              </View>

              {/* Followers Card */}
              <TouchableOpacity style={[styles.statCardHorizontal, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => handleOpenFriends('followers')}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.isDark ? '#1A2332' : '#E3F2FD' }]}>
                  <Ionicons name="people" size={20} color="#3B82F6" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={[styles.statNumber, { color: theme.text }]}>{followersCount}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Followers</Text>
                </View>
              </TouchableOpacity>

              {/* Following Card */}
              <TouchableOpacity style={[styles.statCardHorizontal, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={() => handleOpenFriends('following')}>
                <View style={[styles.statIconCircle, { backgroundColor: theme.isDark ? '#2E2416' : '#FFF3E0' }]}>
                  <Ionicons name="person-add" size={20} color="#F59E0B" />
                </View>
                <View style={styles.statInfo}>
                  <Text style={[styles.statNumber, { color: theme.text }]}>{followingCount}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Following</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stories and Saved Posts Row */}
          <View style={styles.cardsRow}>
            {/* My Stories Card */}
            <TouchableOpacity
              style={[styles.compactCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowAllStoriesModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.compactIconBadge, { backgroundColor: theme.isDark ? '#1E1B2E' : '#EDE7F6' }]}>
                <Ionicons name="document-text" size={24} color="#111827" />
              </View>
              <Text style={[styles.compactCount, { color: theme.text }]}>{userPosts.length}</Text>
              <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>My Stories</Text>
            </TouchableOpacity>

            {/* Saved Posts Card */}
            <TouchableOpacity
              style={[styles.compactCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowAllSavedModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.compactIconBadge, { backgroundColor: theme.isDark ? '#2E2416' : '#FFF3E0' }]}>
                <Ionicons name="bookmark" size={24} color="#F59E0B" />
              </View>
              <Text style={[styles.compactCount, { color: theme.text }]}>{savedPosts.length}</Text>
              <Text style={[styles.compactLabel, { color: theme.textSecondary }]}>Saved Posts</Text>
            </TouchableOpacity>
          </View>

          {/* Supportive History Section */}
          <TouchableOpacity
            style={[styles.section, { backgroundColor: theme.isDark ? '#000000' : theme.card, borderColor: theme.border, padding: 16, borderRadius: 12 }]}
            onPress={() => setShowAllHistoryModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Supportive History</Text>
              <Ionicons name="chevron-forward" size={20} color="#111827" />
            </View>

            {loadingHistory ? (
              <View style={[styles.summaryCard, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF' }]}>
                <ActivityIndicator size="small" color={theme.isDark ? '#B39DDB' : '#111827'} />
              </View>
            ) : (
              <View style={[styles.summaryCard, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF' }]}>
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F3E5F5' }]}>
                    <Ionicons name="heart" size={24} color="#E57373" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={[styles.summaryCount, { color: theme.text }]}>{supportiveHistory.length}</Text>
                    <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                      {supportiveHistory.length === 1 ? 'Interaction' : 'Interactions'}
                    </Text>
                  </View>
                </View>
                {supportiveHistory.length > 0 && (
                  <Text style={styles.summaryHint}>Tap to view your support history</Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.privacyButton}
              onPress={handlePrivacySettings}
            >
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              <Text style={styles.privacyButtonText}>Privacy Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#111827" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deactivateButton}
              onPress={handleDeactivateAccount}
            >
              <Text style={styles.deactivateButtonText}>
                DEACTIVATE ACCOUNT
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* All Stories Modal */}
        <Modal
          visible={showAllStoriesModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAllStoriesModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent80, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>All My Stories</Text>
                <TouchableOpacity
                  onPress={() => setShowAllStoriesModal(false)}
                >
                  <Ionicons name="close" size={28} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={[styles.modalScrollView, { backgroundColor: theme.surface }]} contentContainerStyle={[styles.modalScrollContent, { backgroundColor: theme.surface, paddingHorizontal: 12, paddingVertical: 8 }]}>
                {userPosts.map((post) => {
                  const postData = {
                    ...post,
                    timestamp: getTimeAgo(post.createdAt),
                    authorName: user?.displayName || userProfile?.displayName || "Anonymous",
                    authorId: user?.uid || null,
                    isAnonymous: post.isAnonymous || false,
                  };

                  return (
                    <View key={post.id} style={[styles.postCardWrapper, { marginBottom: 12 }]}>
                      <PostCard post={postData} hideDescription={false} />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* All Saved Posts Modal */}
        <Modal
          visible={showAllSavedModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAllSavedModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent80, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Saved Posts</Text>
                <TouchableOpacity
                  onPress={() => setShowAllSavedModal(false)}
                >
                  <Ionicons name="close" size={28} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={[styles.modalScrollView, { backgroundColor: theme.surface }]} contentContainerStyle={[styles.modalScrollContent, { backgroundColor: theme.surface, paddingHorizontal: 12, paddingVertical: 8 }]}>
                {savedPosts.length > 0 ? (
                  savedPosts.map((post) => {
                    const postData = {
                      ...post,
                      timestamp: getTimeAgo(post.createdAt),
                      authorName: post.authorName || (post.isAnonymous ? "Anonymous" : "Unknown"),
                      authorId: post.authorId || null,
                      isAnonymous: post.isAnonymous || false,
                    };

                    return (
                      <View key={post.id} style={[styles.postCardWrapper, { marginBottom: 12 }]}>
                        <PostCard post={postData} hideDescription={false} />
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="bookmark-outline" size={64} color={theme.textTertiary} />
                    <Text style={[styles.emptyStateTitle, { color: theme.textSecondary }]}>No saved posts yet</Text>
                    <Text style={[styles.emptyStateText, { color: theme.textTertiary }]}>
                      Tap the bookmark icon on any post to save it!
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* All History Modal */}
        <Modal
          visible={showAllHistoryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAllHistoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent75, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Supportive History</Text>
                <TouchableOpacity
                  onPress={() => setShowAllHistoryModal(false)}
                >
                  <Ionicons name="close" size={28} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={[styles.modalScrollView, { backgroundColor: theme.surface }]} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                {supportiveHistory.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => {
                      setShowAllHistoryModal(false);
                      router.push(`/post/${item.postId}`);
                    }}
                  >
                    <Text
                      style={[
                        styles.historyTag,
                        { color: getHistoryCardTextColor(item.type) },
                      ]}
                    >
                      {item.action.toUpperCase()}
                    </Text>
                    <Text style={[styles.historyTime, { color: theme.textTertiary }]}>
                      {getTimeAgo(item.timestamp)}
                    </Text>
                    {item.type === "comment" ? (
                      <Text style={[styles.historyText, { color: theme.textSecondary }]}>
                        &ldquo;{item.comment}&rdquo; in &ldquo;{item.postTitle}&rdquo;
                      </Text>
                    ) : (
                      <Text style={[styles.historyText, { color: theme.textSecondary }]}>
                        {item.postTitle}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Avatar Selection Modal */}
        <AvatarSelectionModal
          visible={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          onSelect={handleAvatarSelect}
          currentSeed={profileCode}
        />

        <EditProfileModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          user={user}
          onUpdate={handleProfileUpdate}
        />

        {/* Friends List Modal */}
        <Modal
          visible={showFriendsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFriendsModal(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent75, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF' }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {friendsListType === 'following' ? 'Following' : 'Followers'}
                </Text>
                <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
                  <Ionicons name="close" size={28} color={theme.text} />
                </TouchableOpacity>
              </View>

              {isLoadingFriends ? (
                <View style={styles.loadingContainer}>
                  <Loading size="large" color={theme.isDark ? '#B39DDB' : '#111827'} />
                </View>
              ) : (
                <ScrollView style={[styles.modalScrollView, { backgroundColor: theme.surface }]}>
                  {friendsList.length > 0 ? (
                    friendsList.map(friend => (
                      <TouchableOpacity
                        key={friend.id}
                        style={[styles.friendItem, { borderBottomColor: theme.divider }]}
                        onPress={() => {
                          setShowFriendsModal(false);
                          router.push(`/user/${friend.id}`);
                        }}
                      >
                        <Avatar seed={friend.profileCode || friend.email} size={50} />
                        <View style={styles.friendInfo}>
                          <Text style={[styles.friendName, { color: theme.text }]}>{friend.displayName}</Text>
                          <Text style={[styles.friendBio, { color: theme.textSecondary }]} numberOfLines={1}>
                            {friend.bio || "No bio available"}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                        {friendsListType === 'following' ? "You aren't following anyone yet." : "No followers yet."}
                      </Text>
                    </View>
                  )}
                  <View style={{ height: 40 }} />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
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
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
  },
  editProfileButtonCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#E1BEE7",
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#111827",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  username: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  joinDate: {
    fontSize: 13,
    color: "#9E9E9E",
    marginBottom: 12,
    fontWeight: "500",
  },
  bio: {
    fontSize: 14,
    color: "#616161",
    marginBottom: 16,
    lineHeight: 20,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#F3E5F5",
    borderRadius: 24,
    marginBottom: 16,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  infoSection: {
    width: "100%",
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#616161",
    flex: 1,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  statCardHorizontal: {
    flex: 1,
    minWidth: "48%",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.5,
  },
  recentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9E9E9E",
    letterSpacing: 0.5,
  },
  storyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  storyCategory: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B39DDB",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  storyTime: {
    position: "absolute",
    top: 16,
    right: 16,
    fontSize: 12,
    color: "#BDBDBD",
  },
  storyText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    marginBottom: 12,
  },
  storyFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  storyHugs: {
    fontSize: 13,
    color: "#9E9E9E",
  },
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFB74D",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  historyTime: {
    position: "absolute",
    top: 16,
    right: 16,
    fontSize: 12,
    color: "#BDBDBD",
  },
  historyText: {
    fontSize: 14,
    color: "#616161",
    lineHeight: 20,
    fontStyle: "italic",
  },
  commentPreview: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginTop: 8,
    fontStyle: "italic",
  },
  boldText: {
    fontWeight: "700",
    fontStyle: "normal",
    color: "#111827",
  },
  actionButtons: {
    marginTop: 8,
    gap: 12,
  },
  privacyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  privacyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD54F",
    paddingVertical: 16,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#FFD54F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  deactivateButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  deactivateButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#BDBDBD",
    letterSpacing: 0.5,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  modalScrollView: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  postCardWrapper: {
    marginBottom: 0,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: "#9E9E9E",
    fontSize: 14,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent75: {
    height: "75%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalContent80: {
    height: "80%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  friendBio: {
    fontSize: 13,
    color: "#9E9E9E",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3E5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  summaryContent: {
    flex: 1,
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  summaryHint: {
    fontSize: 12,
    color: "#111827",
    textAlign: "center",
    fontStyle: "italic",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  compactCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  compactIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  compactCount: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
    letterSpacing: -1,
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

});
