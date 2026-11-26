import { auth } from "../config/firebase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useAlert } from "../context/AlertContext";

export default function Settings() {
  const { showAlert } = useAlert();
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, theme, toggleTheme } = useTheme();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  useEffect(() => {
    let active = true;
    auth.currentUser?.getIdTokenResult().then(token => {
      if (active) setIsModerator(token.claims.moderator === true);
    }).catch(() => {});
    return () => { active = false; };
  }, [user?.uid]);

  const handleDarkThemeToggle = (value) => {
    toggleTheme();
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      showAlert("Error", "Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      showAlert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      if (!auth.currentUser) throw new Error("Please sign in again.");
      const firebaseUser = auth.currentUser;
      if (firebaseUser.providerData.some(provider => provider.providerId === "password")) {
        if (!currentPassword) throw new Error("Enter your current password to confirm this change.");
        await reauthenticateWithCredential(firebaseUser, EmailAuthProvider.credential(firebaseUser.email, currentPassword));
      }
      await updatePassword(firebaseUser, newPassword);
      showAlert("Success", "Password changed successfully");
      setShowChangePasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password change error:", error);
      if (error.code === "auth/requires-recent-login") {
        showAlert(
          "Error",
          "For security reasons, please log out and log in again before changing your password"
        );
      } else {
        showAlert("Error", error.message || "Failed to change password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.surface} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>

          <View style={[styles.settingItem, { borderBottomColor: theme.divider }]}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F3E5F5' }]}>
                <Ionicons name="moon" size={22} color={theme.isDark ? '#B39DDB' : '#111827'} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  {isDark ? 'Dark theme is active' : 'Switch to dark theme'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleDarkThemeToggle}
              trackColor={{ false: theme.inputBorder, true: '#B39DDB' }}
              thumbColor={isDark ? '#111827' : '#F3F4F6'}
              ios_backgroundColor={theme.inputBorder}
            />
          </View>
        </View>

        {/* Security Section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SECURITY</Text>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.divider }]}
            onPress={() => setShowChangePasswordModal(true)}
          >
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFF3E0' }]}>
                <Ionicons name="key" size={22} color={theme.isDark ? '#FFB74D' : '#FF9800'} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Change Password</Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                  Update your account password
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {isModerator && <TouchableOpacity accessibilityRole="button" style={styles.section} onPress={() => router.push('/moderation')}>
          <Text style={{ color: theme.text }}>Review content reports</Text>
        </TouchableOpacity>}

        {/* Account Info */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT INFORMATION</Text>

          <View style={[styles.infoItem, { borderBottomColor: theme.divider }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{user?.email || "N/A"}</Text>
          </View>

          <View style={[styles.infoItem, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>User ID</Text>
            <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>
              {user?.uid || "N/A"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setShowChangePasswordModal(false)}
              >
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Current Password</Text>
              <TextInput accessibilityLabel="Current password" style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.inputBorder }]}
                value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCapitalize="none" placeholder="For email/password accounts" placeholderTextColor={theme.placeholder} />
              <Text style={[styles.inputLabel, { color: theme.text }]}>New Password</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                  color: theme.text
                }]}
                placeholder="Enter new password"
                placeholderTextColor={theme.placeholder}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Confirm Password</Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.input,
                  borderColor: theme.inputBorder,
                  color: theme.text
                }]}
                placeholder="Confirm new password"
                placeholderTextColor={theme.placeholder}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.changeButton, loading && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.changeButtonText}>
                  {loading ? "Changing..." : "Change Password"}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.passwordHint, { color: theme.textSecondary }]}>
                Password must be at least 6 characters long
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1 },
  backButton: {
    padding: 4 },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Frederick' },
  placeholder: {
    width: 32 },
  content: {
    flex: 1 },
  section: {
    marginTop: 20,
    paddingVertical: 8 },
  sectionTitle: {
    fontSize: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    letterSpacing: 1,
    fontFamily: 'Frederick' },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1 },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1 },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16 },
  settingText: {
    flex: 1 },
  settingLabel: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 4,
    fontFamily: 'Fredoka-Regular' },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Fredoka-Regular' },
  infoItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1 },
  infoLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '400',
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: 'Fredoka-Regular' },
  infoValue: {
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'Fredoka-Regular' },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    fontFamily: 'Frederick' },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Frederick' },
  modalBody: {
    padding: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
    marginTop: 12,
    fontFamily: 'Fredoka-Regular' },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    fontFamily: 'Fredoka-Regular' },
  changeButton: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24 },
  buttonDisabled: {
    opacity: 0.6 },
  changeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Fredoka-Regular' },
  passwordHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    fontFamily: 'Fredoka-Regular' } });
