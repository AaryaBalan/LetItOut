import { Ionicons } from "@expo/vector-icons";
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function FilterModal({
    visible,
    onClose,
    selectedFilter,
    setSelectedFilter,
    selectedSort,
    setSelectedSort,
    selectedMood,
    setSelectedMood,
    showAnonymousOnly,
    setShowAnonymousOnly,
}) {
    const { theme } = useTheme();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                                <Text style={[styles.modalTitle, { color: theme.text }]}>Sort & Filter</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close" size={28} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Sort & Filter Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Sort & Filter</Text>
                                <View style={styles.modalOptionsColumn}>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            { backgroundColor: theme.isDark ? '#0A0A0A' : '#FFFFFF', borderColor: theme.border },
                                            selectedFilter === "latest" && selectedSort === "recent" && styles.modalOptionActive,
                                        ]}
                                        onPress={() => {
                                            setSelectedFilter("latest");
                                            setSelectedSort("recent");
                                        }}
                                    >
                                        <Ionicons
                                            name="time-outline"
                                            size={20}
                                            color={selectedFilter === "latest" && selectedSort === "recent" ? "#9B8BC9" : theme.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.modalOptionText,
                                                { color: theme.text },
                                                selectedFilter === "latest" && selectedSort === "recent" && styles.modalOptionTextActive,
                                            ]}
                                        >
                                            Latest
                                        </Text>
                                        {selectedFilter === "latest" && selectedSort === "recent" && (
                                            <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            { backgroundColor: theme.isDark ? '#0A0A0A' : '#FFFFFF', borderColor: theme.border },
                                            selectedFilter === "help" && styles.modalOptionActive,
                                        ]}
                                        onPress={() => {
                                            setSelectedFilter("help");
                                            setSelectedSort("help");
                                        }}
                                    >
                                        <Ionicons
                                            name="hand-left-outline"
                                            size={20}
                                            color={selectedFilter === "help" ? "#9B8BC9" : theme.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.modalOptionText,
                                                { color: theme.text },
                                                selectedFilter === "help" && styles.modalOptionTextActive,
                                            ]}
                                        >
                                            Help Needed
                                        </Text>
                                        {selectedFilter === "help" && (
                                            <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            { backgroundColor: theme.isDark ? '#0A0A0A' : '#FFFFFF', borderColor: theme.border },
                                            selectedSort === "popular" && styles.modalOptionActive,
                                        ]}
                                        onPress={() => {
                                            setSelectedFilter("latest");
                                            setSelectedSort("popular");
                                        }}
                                    >
                                        <Ionicons
                                            name="trending-up-outline"
                                            size={20}
                                            color={selectedSort === "popular" ? "#9B8BC9" : theme.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.modalOptionText,
                                                { color: theme.text },
                                                selectedSort === "popular" && styles.modalOptionTextActive,
                                            ]}
                                        >
                                            Popular
                                        </Text>
                                        {selectedSort === "popular" && (
                                            <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            { backgroundColor: theme.isDark ? '#0A0A0A' : '#FFFFFF', borderColor: theme.border },
                                            selectedSort === "mostCommented" && styles.modalOptionActive,
                                        ]}
                                        onPress={() => {
                                            setSelectedFilter("latest");
                                            setSelectedSort("mostCommented");
                                        }}
                                    >
                                        <Ionicons
                                            name="chatbubbles-outline"
                                            size={20}
                                            color={selectedSort === "mostCommented" ? "#9B8BC9" : theme.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.modalOptionText,
                                                { color: theme.text },
                                                selectedSort === "mostCommented" && styles.modalOptionTextActive,
                                            ]}
                                        >
                                            Most Commented
                                        </Text>
                                        {selectedSort === "mostCommented" && (
                                            <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Content Type Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Content Type</Text>
                                <View style={styles.modalOptionsColumn}>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            { backgroundColor: theme.isDark ? '#0A0A0A' : '#FFFFFF', borderColor: theme.border },
                                            showAnonymousOnly && styles.modalOptionActive,
                                        ]}
                                        onPress={() => setShowAnonymousOnly(!showAnonymousOnly)}
                                    >
                                        <Ionicons
                                            name="eye-off-outline"
                                            size={20}
                                            color={showAnonymousOnly ? "#9B8BC9" : theme.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.modalOptionText,
                                                { color: theme.text },
                                                showAnonymousOnly && styles.modalOptionTextActive,
                                            ]}
                                        >
                                            Anonymous Stories Only
                                        </Text>
                                        {showAnonymousOnly && (
                                            <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Mood Section */}
                            <View style={styles.modalSection}>
                                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Filter by Mood</Text>
                                <View style={styles.modalOptionsColumn}>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            { backgroundColor: theme.isDark ? '#0A0A0A' : '#FFFFFF', borderColor: theme.border },
                                            selectedMood === "depression" && styles.modalOptionActive,
                                        ]}
                                        onPress={() => {
                                            setSelectedMood(selectedMood === "depression" ? null : "depression");
                                        }}
                                    >
                                        <Ionicons
                                            name="sad-outline"
                                            size={20}
                                            color={selectedMood === "depression" ? "#9B8BC9" : theme.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.modalOptionText,
                                                { color: theme.text },
                                                selectedMood === "depression" && styles.modalOptionTextActive,
                                            ]}
                                        >
                                            Depression
                                        </Text>
                                        {selectedMood === "depression" && (
                                            <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            { backgroundColor: theme.isDark ? '#0A0A0A' : '#FFFFFF', borderColor: theme.border },
                                            selectedMood === "happiness" && styles.modalOptionActive,
                                        ]}
                                        onPress={() => {
                                            setSelectedMood(selectedMood === "happiness" ? null : "happiness");
                                        }}
                                    >
                                        <Ionicons
                                            name="happy-outline"
                                            size={20}
                                            color={selectedMood === "happiness" ? "#9B8BC9" : theme.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.modalOptionText,
                                                { color: theme.text },
                                                selectedMood === "happiness" && styles.modalOptionTextActive,
                                            ]}
                                        >
                                            Happiness
                                        </Text>
                                        {selectedMood === "happiness" && (
                                            <Ionicons name="checkmark" size={20} color="#9B8BC9" style={{ marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Apply Button */}
                            <TouchableOpacity
                                style={styles.applyButton}
                                onPress={onClose}
                            >
                                <Text style={styles.applyButtonText}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
        maxHeight: "80%", // Ensure it fits on screen
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
    },
    modalSection: {
        marginBottom: 28,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#374151",
        marginBottom: 12,
    },
    modalOptionsColumn: {
        gap: 8,
    },
    modalOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#F9FAFB",
        gap: 12,
        borderWidth: 1,
        borderColor: "transparent",
    },
    modalOptionActive: {
        backgroundColor: "#E8E4F3",
        borderColor: "#9B8BC9",
    },
    modalOptionText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#374151",
    },
    modalOptionTextActive: {
        color: "#9B8BC9",
        fontWeight: "600",
    },
    applyButton: {
        backgroundColor: "#9B8BC9",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 12,
    },
    applyButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});
