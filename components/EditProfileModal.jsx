import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { db } from "../config/firebase";
import { useTheme } from "../context/ThemeContext";

export default function EditProfileModal({ visible, onClose, user, onUpdate }) {
    const { theme } = useTheme();
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchUserData = useCallback(async () => {
        try {
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const data = userDoc.data();
                setDisplayName(data.displayName || "");
                setBio(data.bio || "");
                setPhoneNumber(data.phoneNumber || "");
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    }, [user]);

    useEffect(() => {
        if (visible && user) {
            // Fetch latest user data
            fetchUserData();
        }
    }, [visible, user, fetchUserData]);

    const handleSave = async () => {
        if (!displayName.trim()) {
            Alert.alert("Error", "Display name is required");
            return;
        }

        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                displayName: displayName.trim(),
                bio: bio.trim(),
                phoneNumber: phoneNumber.trim(),
                updatedAt: new Date(),
            });

            Alert.alert("Success", "Profile updated successfully!");
            onUpdate();
            onClose();
        } catch (error) {
            console.error("Error updating profile:", error);
            Alert.alert("Error", "Failed to update profile");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={[styles.backdrop, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]} onPress={onClose}>
                <View
                    style={[styles.modalContainer, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF' }]}
                    onStartShouldSetResponder={() => true}
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>Edit Profile</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Display Name</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB', borderColor: theme.isDark ? '#2A2A2A' : '#E5E7EB', color: theme.text }]}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="Enter your name"
                                placeholderTextColor={theme.placeholder}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
                            <TextInput
                                style={[styles.input, styles.disabledInput, { backgroundColor: theme.isDark ? '#0A0A0A' : '#F3F4F6', borderColor: theme.isDark ? '#2A2A2A' : '#E5E7EB', color: theme.textSecondary }]}
                                value={user?.email || ""}
                                editable={false}
                                placeholderTextColor={theme.placeholder}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Phone Number</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB', borderColor: theme.isDark ? '#2A2A2A' : '#E5E7EB', color: theme.text }]}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                placeholder="+1 234 567 8900"
                                placeholderTextColor={theme.placeholder}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea, { backgroundColor: theme.isDark ? '#1A1A1A' : '#F9FAFB', borderColor: theme.isDark ? '#2A2A2A' : '#E5E7EB', color: theme.text }]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell us about yourself..."
                                placeholderTextColor={theme.placeholder}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                maxLength={150}
                            />
                            <Text style={[styles.charCount, { color: theme.textTertiary }]}>{bio.length}/150</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: theme.isDark ? '#2A2A2A' : '#F3F4F6' }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.cancelButtonText, { color: theme.isDark ? theme.textSecondary : '#6B7280' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            <Text style={styles.saveButtonText}>
                                {loading ? "Saving..." : "Save"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 16,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#1F2937",
    },
    content: {
        paddingHorizontal: 24,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: "#1F2937",
        backgroundColor: "#F9FAFB",
    },
    disabledInput: {
        backgroundColor: "#F3F4F6",
        color: "#9CA3AF",
    },
    textArea: {
        minHeight: 70,
        paddingTop: 10,
    },
    charCount: {
        fontSize: 11,
        color: "#9CA3AF",
        textAlign: "right",
        marginTop: 4,
    },
    footer: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 24,
        marginTop: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#F3F4F6",
    },
    saveButton: {
        backgroundColor: "#8B5CF6",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
