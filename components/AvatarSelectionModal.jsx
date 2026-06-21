import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";

export default function AvatarSelectionModal({
    visible,
    onClose,
    onSelect,
    currentSeed }) {
    const { theme } = useTheme();
    const [randomSeeds, setRandomSeeds] = useState([]);
    const [selectedSeed, setSelectedSeed] = useState(currentSeed);

    const generateRandomSeeds = () => {
        const seeds = Array.from({ length: 12 }, () =>
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
            <Pressable style={[styles.backdrop, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.6)' }]} onPress={onClose}>
                <View
                    style={[styles.modalContainer, { backgroundColor: theme.isDark ? '#1A1A1A' : '#FFFFFF' }]}
                    onStartShouldSetResponder={() => true}
                >
                    {/* Handle Bar */}
                    <View style={styles.handleBar} />

                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.title, { color: theme.text }]}>Choose Your Avatar</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Select from 12 unique avatars</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={generateRandomSeeds}
                        >
                            <Ionicons name="refresh-circle" size={36} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={styles.avatarGrid}
                        showsVerticalScrollIndicator={false}
                    >
                        {randomSeeds.map((seed, index) => (
                            <TouchableOpacity
                                key={seed}
                                style={[
                                    styles.avatarOption,
                                    { backgroundColor: theme.isDark ? '#2A2A2A' : '#F8F9FA' },
                                    selectedSeed === seed && styles.selectedAvatar,
                                ]}
                                onPress={() => setSelectedSeed(seed)}
                                activeOpacity={0.7}
                            >
                                <Avatar seed={seed} size={90} square={true} />
                                {selectedSeed === seed && (
                                    <View style={styles.checkmarkContainer}>
                                        <Ionicons name="checkmark-circle" size={28} color="#111827" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton, { backgroundColor: theme.isDark ? '#2A2A2A' : '#F3F4F6' }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.cancelButtonText, { color: theme.isDark ? theme.textSecondary : '#6B7280' }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.selectButton]}
                            onPress={handleSelect}
                        >
                            <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.selectButtonText}>Select Avatar</Text>
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
        justifyContent: "flex-end" },
    modalContainer: {
        width: "100%",
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 28,
        maxHeight: "85%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8 },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: 20 },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 24 },
    title: {
        fontSize: 26,
        fontWeight: '400',
        color: "#1F2937",
        marginBottom: 4,
        fontFamily: 'Fredoka-Regular' },
    subtitle: {
        fontSize: 14,
        color: "#9E9E9E",
        fontWeight: '400',
        fontFamily: 'Fredoka-Regular' },
    refreshButton: {
        padding: 4 },
    avatarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 10,
        paddingBottom: 12 },
    avatarOption: {
        width: "31%",
        aspectRatio: 1,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: "transparent",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2 },
    selectedAvatar: {
        borderColor: "#111827",
        shadowColor: "#111827",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4 },
    checkmarkContainer: {
        position: "absolute",
        top: 8,
        right: 8,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3 },
    buttonContainer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24 },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2 },
    cancelButton: {
        backgroundColor: "#F3F4F6" },
    selectButton: {
        backgroundColor: "#111827",
        shadowColor: "#111827",
        shadowOpacity: 0.3 },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '400',
        color: "#6B7280",
        fontFamily: 'Fredoka-Regular' },
    selectButtonText: {
        fontSize: 16,
        fontWeight: '400',
        color: "#FFFFFF",
        fontFamily: 'Fredoka-Regular' } });
