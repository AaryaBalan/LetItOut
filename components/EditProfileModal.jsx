import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
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

export default function EditProfileModal({ visible, onClose, user, onUpdate }) {
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && user) {
            // Fetch latest user data
            fetchUserData();
        }
    }, [visible, user]);

    const fetchUserData = async () => {
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
    };

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
            <Pressable style={styles.backdrop} onPress={onClose}>
                <View
                    style={styles.modalContainer}
                    onStartShouldSetResponder={() => true}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Edit Profile</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#2D2D2D" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Display Name</Text>
                            <TextInput
                                style={styles.input}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="Enter your name"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={[styles.input, styles.disabledInput]}
                                value={user?.email || ""}
                                editable={false}
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                placeholder="+1 234 567 8900"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Tell us about yourself..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                maxLength={150}
                            />
                            <Text style={styles.charCount}>{bio.length}/150</Text>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
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
