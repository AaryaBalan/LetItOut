import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
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

  // Update profileCode when user data changes
  useEffect(() => {
    if (user) {
      setProfileCode(user.profileCode || user.email || "");
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleProfileUpdate = () => {
    // Refresh user profile data
    fetchUserProfile();
  };

  const handleAvatarSelect = async (newSeed) => {
    try {
      // Update profileCode in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        profileCode: newSeed,
      });

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
            commentCount: 0,
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
              <Text style={styles.statNumber}>32</Text>
              <Text style={styles.statLabel}>HUGS SENT</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{userPosts.length}</Text>
              <Text style={styles.statLabel}>STORIES SHARED</Text>
            </View>
          </View>
        </View>

        {/* My Stories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Stories</Text>
            {userPosts.length > 2 && (
              <TouchableOpacity
                onPress={() => setShowAllStoriesModal(true)}
              >
                <Text style={styles.viewAllText}>VIEW ALL</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingPosts ? (
            <View style={styles.storyCard}>
              <Text style={styles.storyText}>Loading your posts...</Text>
            </View>
          ) : userPosts.length > 0 ? (
            userPosts.slice(0, 2).map((post) => {
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
                  onPress={() => router.push(`/post/${post.id}`)}
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
            })
          ) : (
            <View style={styles.storyCard}>
              <Text style={styles.storyText}>
                No posts yet. Share your first thought!
              </Text>
            </View>
          )}
        </View>

        {/* Supportive History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Supportive History</Text>
            {supportiveHistory.length > 2 && (
              <TouchableOpacity
                onPress={() => setShowAllHistoryModal(true)}
              >
                <Text style={styles.recentText}>VIEW MORE</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingHistory ? (
            <View style={styles.historyCard}>
              <Text style={styles.historyText}>
                Loading your activity...
              </Text>
            </View>
          ) : supportiveHistory.length > 0 ? (
            supportiveHistory.slice(0, 2).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyCard}
                onPress={() => router.push(`/post/${item.postId}`)}
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
                  <Text style={styles.historyText} numberOfLines={2}>
                    "{item.comment.substring(0, 50)}
                    {item.comment.length > 50 ? "..." : ""}" in "
                    {item.postTitle}"
                  </Text>
                ) : (
                  <Text style={styles.historyText} numberOfLines={2}>
                    {item.postTitle}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.historyCard}>
              <Text style={styles.historyText}>
                No activity yet. Start supporting others!
              </Text>
            </View>
          )}
        </View>

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

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
        onUpdate={handleProfileUpdate}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
    color: "#9E9E9E",
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    color: "#616161",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#F3E5F5",
    borderRadius: 20,
    marginBottom: 20,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  infoSection: {
    width: "100%",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
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
    width: "100%",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#9575cd",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9E9E9E",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
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
    backgroundColor: "#F5F5F5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
});
