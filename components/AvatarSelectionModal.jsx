import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Avatar from "./Avatar";

export default function AvatarSelectionModal({
    visible,
    onClose,
    onSelect,
    currentSeed,
}) {
    const [randomSeeds, setRandomSeeds] = useState([]);
    const [selectedSeed, setSelectedSeed] = useState(currentSeed);

    const generateRandomSeeds = () => {
        const seeds = Array.from({ length: 10 }, () =>
            Math.random().toString(36).substring(2, 15),
        );
        setRandomSeeds(seeds);
    };

    useEffect(() => {
        if (visible) {
            generateRandomSeeds();
            setSelectedSeed(currentSeed);
        }
    }, [visible, currentSeed]);

    const handleSelect = () => {
        onSelect(selectedSeed);
        onClose();
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
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Choose Your Avatar</Text>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={generateRandomSeeds}
                        >
                            <Ionicons name="refresh" size={24} color="#8B5CF6" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.avatarGrid}
                        showsVerticalScrollIndicator={false}
                    >
                        {randomSeeds.map((seed) => (
                            <TouchableOpacity
                                key={seed}
                                style={[
                                    styles.avatarOption,
                                    selectedSeed === seed && styles.selectedAvatar,
                                ]}
                                onPress={() => setSelectedSeed(seed)}
                            >
                                <Avatar seed={seed} size={100} square={true} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.selectButton]}
                            onPress={handleSelect}
                        >
                            <Text style={styles.selectButtonText}>Select</Text>
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
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: "80%",
    },
    titleContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1F2937",
    },
    refreshButton: {
        padding: 8,
    },
    avatarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 12,
    },
    avatarOption: {
        width: "47%",
        aspectRatio: 1,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#EFE8FF",
        overflow: "hidden",
    },
    selectedAvatar: {
        borderColor: "#8B5CF6",
    },
    buttonContainer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    cancelButton: {
        backgroundColor: "#F3F4F6",
    },
    selectButton: {
        backgroundColor: "#8B5CF6",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
    },
    selectButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
