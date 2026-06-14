import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { updatePassword } from "firebase/auth";
import { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Settings() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, theme, toggleTheme } = useTheme();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDarkThemeToggle = (value) => {
    toggleTheme();
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(user, newPassword);
      Alert.alert("Success", "Password changed successfully");
      setShowChangePasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password change error:", error);
      if (error.code === "auth/requires-recent-login") {
        Alert.alert(
          "Error",
          "For security reasons, please log out and log in again before changing your password"
        );
      } else {
        Alert.alert("Error", error.message || "Failed to change password");
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
                <Ionicons name="moon" size={22} color={theme.isDark ? '#B39DDB' : '#7C3AED'} />
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
              thumbColor={isDark ? '#7C3AED' : '#F3F4F6'}
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingBottom: 12,
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
  },
  infoItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  changeButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  changeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  passwordHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
});
