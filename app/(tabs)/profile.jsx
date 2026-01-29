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
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showAllStoriesModal, setShowAllStoriesModal] = useState(false);
  const [showAllHistoryModal, setShowAllHistoryModal] = useState(false);
  const [postReactions, setPostReactions] = useState({});
  const [supportiveHistory, setSupportiveHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
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
  const [loadingSavedPosts, setLoadingSavedPosts] = useState(true);
  const [showAllSavedModal, setShowAllSavedModal] = useState(false);

  // Listen to user profile changes in real-time
  useEffect(() => {
    if (!user) return;

    setProfileCode(user.profileCode || user.email || "");

    // Set up real-time listener for user profile
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
      },
      (error) => {
        console.error("Error listening to user profile:", error);
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

  // Fetch reaction counts for user's posts in real-time
  useEffect(() => {
    if (!user || userPosts.length === 0) return;

    const postIds = userPosts.map((p) => String(p.id));
    const reactionsRef = collection(db, "reactions");

    // Create listeners for each post's reactions
    const unsubscribes = postIds.map((postId) => {
      const q = query(reactionsRef, where("postId", "==", postId));

      return onSnapshot(q, (snapshot) => {
        const counts = { like: 0, hug: 0, metoo: 0 };
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.type === "like") counts.like++;
          else if (data.type === "hug") counts.hug++;
          else if (data.type === "metoo") counts.metoo++;
        });

        setPostReactions((prev) => ({
          ...prev,
          [postId]: counts,
        }));
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user, userPosts.map((p) => p.id).join(",")]);

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
        setLoadingSavedPosts(false);
        return;
      }

      try {
        // Get user's saved posts array
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const savedPostIds = userDoc.data().savedPosts || [];

          if (savedPostIds.length === 0) {
            setSavedPosts([]);
            setLoadingSavedPosts(false);
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
        }
      } catch (error) {
        console.error("Error fetching saved posts:", error);
      } finally {
        setLoadingSavedPosts(false);
      }
    };

    fetchSavedPosts();
  }, [user]);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Just now";
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffInMs = now - postDate;
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  const getHistoryCardTextColor = (type) => {
    if (type === "like") return "#F06292"; // Pink
    if (type === "hug") return "#FFB74D"; // Orange/Yellow
    if (type === "metoo") return "#66BB6A"; // Green
    if (type === "comment") return "#9575cd"; // Violet
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
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
        <View style={styles.notLoggedInContainer}>
          <Ionicons
            name="person-circle-outline"
            size={80}
            color="#BDBDBD"
          />
          <Text style={styles.notLoggedInTitle}>Not Logged In</Text>
          <Text style={styles.notLoggedInText}>
            Please log in to view your profile
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings" size={24} color="#212121" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Avatar seed={profileCode} size={100} />
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => setShowAvatarModal(true)}
            >
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.username}>
            {user.displayName || "Anonymous User"}
          </Text>
          <Text style={styles.joinDate}>Joined {joinDate}</Text>

          {/* Bio */}
          {userProfile?.bio && (
            <Text style={styles.bio}>{userProfile.bio}</Text>
          )}

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => setShowEditModal(true)}
          >
            <Ionicons name="create-outline" size={18} color="#8B5CF6" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Additional Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={16} color="#757575" />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
            {userProfile?.phoneNumber && (
              <View style={styles.infoItem}>
                <Ionicons
                  name="call-outline"
                  size={16}
                  color="#757575"
                />
                <Text style={styles.infoText}>
                  {userProfile.phoneNumber}
                </Text>
              </View>
            )}
            <View style={styles.infoItem}>
              <Ionicons
                name="person-outline"
                size={16}
                color="#757575"
              />
              <Text style={styles.infoText}>
                {user.displayName || "Anonymous"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color="#757575"
              />
              <Text style={styles.infoText}>
                Member since {memberSince}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userProfile?.loveSent || 0}</Text>
              <Text style={styles.statLabel}>LOVE SENT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userProfile?.postCount || 0}</Text>
              <Text style={styles.statLabel}>STORIES</Text>
            </View>
            <TouchableOpacity style={styles.statBox} onPress={() => handleOpenFriends('followers')}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>FOLLOWERS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statBox} onPress={() => handleOpenFriends('following')}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>FOLLOWING</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stories and Saved Posts Row */}
        <View style={styles.cardsRow}>
          {/* My Stories Card */}
          <TouchableOpacity
            style={[styles.squareCard, styles.storiesCard]}
            onPress={() => setShowAllStoriesModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.squareCardContent}>
              <View style={[styles.squareIconContainer, styles.storiesIconBg]}>
                <Ionicons name="document-text" size={32} color="#7C3AED" />
              </View>
              <Text style={styles.squareCount}>{userPosts.length}</Text>
              <Text style={styles.squareLabel}>My Stories</Text>
            </View>
          </TouchableOpacity>

          {/* Saved Posts Card */}
          <TouchableOpacity
            style={[styles.squareCard, styles.savedCard]}
            onPress={() => setShowAllSavedModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.squareCardContent}>
              <View style={[styles.squareIconContainer, styles.savedIconBg]}>
                <Ionicons name="bookmark" size={32} color="#F59E0B" />
              </View>
              <Text style={styles.squareCount}>{savedPosts.length}</Text>
              <Text style={styles.squareLabel}>Saved Posts</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Supportive History Section */}
        <TouchableOpacity
          style={styles.section}
          onPress={() => setShowAllHistoryModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Supportive History</Text>
            <Ionicons name="chevron-forward" size={20} color="#9575cd" />
          </View>

          {loadingHistory ? (
            <View style={styles.summaryCard}>
              <ActivityIndicator size="small" color="#B39DDB" />
            </View>
          ) : (
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconContainer}>
                  <Ionicons name="heart" size={24} color="#E57373" />
                </View>
                <View style={styles.summaryContent}>
                  <Text style={styles.summaryCount}>{supportiveHistory.length}</Text>
                  <Text style={styles.summaryLabel}>
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
            <Ionicons name="log-out-outline" size={20} color="#212121" />
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
        transparent={false}
        onRequestClose={() => setShowAllStoriesModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All My Stories</Text>
            <TouchableOpacity
              onPress={() => setShowAllStoriesModal(false)}
            >
              <Ionicons name="close" size={28} color="#212121" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            {userPosts.map((post) => {
              const reactions = postReactions[post.id] || {
                like: 0,
                hug: 0,
                metoo: 0,
              };
              const totalReactions =
                reactions.like + reactions.hug + reactions.metoo;

              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.storyCard}
                  onPress={() => {
                    setShowAllStoriesModal(false);
                    router.push(`/post/${post.id}`);
                  }}
                >
                  <Text style={styles.storyCategory}>
                    {post.category.toUpperCase()}
                  </Text>
                  <Text style={styles.storyTime}>
                    {getTimeAgo(post.createdAt)}
                  </Text>
                  <Text style={styles.storyText} numberOfLines={2}>
                    {post.title}
                  </Text>
                  <View style={styles.storyFooter}>
                    <Ionicons
                      name="heart"
                      size={16}
                      color="#E57373"
                    />
                    <Text style={styles.storyHugs}>
                      {totalReactions} reactions received
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* All Saved Posts Modal */}
      <Modal
        visible={showAllSavedModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAllSavedModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Saved Posts</Text>
            <TouchableOpacity
              onPress={() => setShowAllSavedModal(false)}
            >
              <Ionicons name="close" size={28} color="#212121" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            {savedPosts.length > 0 ? (
              savedPosts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.storyCard}
                  onPress={() => {
                    setShowAllSavedModal(false);
                    router.push(`/post/${post.id}`);
                  }}
                >
                  <Text style={styles.storyCategory}>
                    {post.category?.toUpperCase() || "GENERAL"}
                  </Text>
                  <Text style={styles.storyTime}>
                    {getTimeAgo(post.createdAt)}
                  </Text>
                  <Text style={styles.storyText} numberOfLines={2}>
                    {post.title}
                  </Text>
                  <View style={styles.storyFooter}>
                    <Ionicons
                      name="bookmark"
                      size={16}
                      color="#FFB74D"
                    />
                    <Text style={styles.storyHugs}>
                      Saved
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.storyCard}>
                <Text style={styles.storyText}>
                  No saved posts yet. Tap the bookmark icon on any post to save it!
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* All History Modal */}
      <Modal
        visible={showAllHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAllHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent75}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Supportive History</Text>
              <TouchableOpacity
                onPress={() => setShowAllHistoryModal(false)}
              >
                <Ionicons name="close" size={28} color="#212121" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {supportiveHistory.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyCard}
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
                  <Text style={styles.historyTime}>
                    {getTimeAgo(item.timestamp)}
                  </Text>
                  {item.type === "comment" ? (
                    <Text style={styles.historyText}>
                      "{item.comment}" in "{item.postTitle}"
                    </Text>
                  ) : (
                    <Text style={styles.historyText}>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent75}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {friendsListType === 'following' ? 'Following' : 'Followers'}
              </Text>
              <TouchableOpacity onPress={() => setShowFriendsModal(false)}>
                <Ionicons name="close" size={28} color="#212121" />
              </TouchableOpacity>
            </View>

            {isLoadingFriends ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#B39DDB" />
              </View>
            ) : (
              <ScrollView style={styles.modalScrollView}>
                {friendsList.length > 0 ? (
                  friendsList.map(friend => (
                    <TouchableOpacity
                      key={friend.id}
                      style={styles.friendItem}
                      onPress={() => {
                        setShowFriendsModal(false);
                        router.push(`/user/${friend.id}`);
                      }}
                    >
                      <Avatar seed={friend.profileCode || friend.email} size={50} />
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>{friend.displayName}</Text>
                        <Text style={styles.friendBio} numberOfLines={1}>
                          {friend.bio || "No bio available"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#E0E0E0" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F5F5F5",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
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
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 8,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E1BEE7",
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: -8,
    backgroundColor: "#8B5CF6",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  username: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 12,
    color: "#9E9E9E",
    marginBottom: 8,
  },
  bio: {
    fontSize: 13,
    color: "#616161",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 8,
    lineHeight: 18,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#F3E5F5",
    borderRadius: 20,
    marginBottom: 12,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  infoSection: {
    width: "100%",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 6,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#616161",
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    gap: 12,
  },
  statBox: {
    width: "48%",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#9575cd",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9E9E9E",
    letterSpacing: 0.5,
    textAlign: "center",
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
    color: "#212121",
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9575cd",
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
    color: "#424242",
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
    color: "#757575",
    lineHeight: 18,
    marginTop: 8,
    fontStyle: "italic",
  },
  boldText: {
    fontWeight: "700",
    fontStyle: "normal",
    color: "#212121",
  },
  actionButtons: {
    marginTop: 8,
    gap: 12,
  },
  privacyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9575cd",
    paddingVertical: 16,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#9575cd",
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
    color: "#212121",
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
    color: "#212121",
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 15,
    color: "#757575",
    textAlign: "center",
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: "#9575cd",
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
    backgroundColor: "#F5F5F5",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#212121",
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 4,
  },
  friendBio: {
    fontSize: 13,
    color: "#9E9E9E",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#9E9E9E",
    fontSize: 14,
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
    color: "#212121",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#757575",
    fontWeight: "500",
  },
  summaryHint: {
    fontSize: 12,
    color: "#9575cd",
    textAlign: "center",
    fontStyle: "italic",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  squareCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  squareCardContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  squareIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3E5F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  squareCount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 4,
  },
  squareLabel: {
    fontSize: 13,
    storiesCard: {
      backgroundColor: "#F3E8FF",
    },
    storiesIconBg: {
      backgroundColor: "#E9D5FF",
    },
    savedCard: {
      backgroundColor: "#FEF3C7",
    },
    savedIconBg: {
      backgroundColor: "#FDE68A",
    },
    color: "#757575",
    fontWeight: "600",
    textAlign: "center",
  },

});
