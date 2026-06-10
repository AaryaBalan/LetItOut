import { Ionicons } from "@expo/vector-icons";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
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
            <Pressable
                style={styles.modalOverlay}
                onPress={onClose}
            >
                <Pressable style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]} onPress={(e) => e.stopPropagation()}>
                    <View style={[styles.modalHeader, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Ionicons name="options-outline" size={22} color={theme.text} />
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Sort & Filter</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn} delayPressIn={0}>
                            <Ionicons name="close" size={24} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Section 1: Sort Feed */}
                    <View style={styles.modalSection}>
                        <Text style={[styles.modalSectionTitle, { color: theme.textSecondary }]}>SORT FEED BY</Text>
                        <View style={styles.modalChipsRow}>
                            {[
                                { label: "Latest", value: { filter: "latest", sort: "recent" }, icon: "time-outline" },
                                { label: "Popular", value: { filter: "latest", sort: "popular" }, icon: "trending-up-outline" },
                                { label: "Most Commented", value: { filter: "latest", sort: "mostCommented" }, icon: "chatbubbles-outline" },
                                { label: "Help Needed", value: { filter: "help", sort: "help" }, icon: "hand-left-outline" },
                            ].map((opt) => {
                                const isSelected = selectedFilter === opt.value.filter && selectedSort === opt.value.sort;
                                return (
                                    <TouchableOpacity
                                        key={opt.label}
                                        style={[
                                            styles.modalChip,
                                            { backgroundColor: theme.isDark ? '#2D2D3D' : '#F3F4F6', borderColor: theme.border },
                                            isSelected && { backgroundColor: theme.isDark ? '#3C2E5C' : '#EFE8FF', borderColor: '#9575cd' }
                                        ]}
                                        delayPressIn={0}
                                        onPress={() => {
                                            setSelectedFilter(opt.value.filter);
                                            setSelectedSort(opt.value.sort);
                                        }}
                                    >
                                        <Ionicons name={opt.icon} size={16} color={isSelected ? '#9575cd' : theme.textSecondary} />
                                        <Text style={[styles.modalChipText, { color: theme.textSecondary }, isSelected && { color: '#9575cd', fontWeight: '700' }]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Section 2: Author Privacy */}
                    <View style={styles.modalSection}>
                        <Text style={[styles.modalSectionTitle, { color: theme.textSecondary }]}>AUTHOR PRIVACY</Text>
                        <View style={styles.modalChipsRow}>
                            <TouchableOpacity
                                style={[
                                    styles.modalChip,
                                    { backgroundColor: theme.isDark ? '#2D2D3D' : '#F3F4F6', borderColor: theme.border },
                                    showAnonymousOnly && { backgroundColor: theme.isDark ? '#3C2E5C' : '#EFE8FF', borderColor: '#9575cd' }
                                ]}
                                delayPressIn={0}
                                onPress={() => setShowAnonymousOnly(!showAnonymousOnly)}
                            >
                                <Ionicons name="eye-off-outline" size={16} color={showAnonymousOnly ? '#9575cd' : theme.textSecondary} />
                                <Text style={[styles.modalChipText, { color: theme.textSecondary }, showAnonymousOnly && { color: '#9575cd', fontWeight: '700' }]}>
                                    Anonymous Stories Only
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Section 3: Filter by Mood */}
                    <View style={styles.modalSection}>
                        <Text style={[styles.modalSectionTitle, { color: theme.textSecondary }]}>FILTER BY MOOD</Text>
                        <View style={styles.modalChipsRow}>
                            {[
                                { label: "All Moods", value: null, icon: "analytics-outline" },
                                { label: "Venting (-100 to 0)", value: "depression", icon: "sad-outline" },
                                { label: "Happiness (0 to 100)", value: "happiness", icon: "happy-outline" },
                            ].map((opt) => {
                                const isSelected = selectedMood === opt.value;
                                return (
                                    <TouchableOpacity
                                        key={opt.label}
                                        style={[
                                            styles.modalChip,
                                            { backgroundColor: theme.isDark ? '#2D2D3D' : '#F3F4F6', borderColor: theme.border },
                                            isSelected && { backgroundColor: theme.isDark ? '#3C2E5C' : '#EFE8FF', borderColor: '#9575cd' }
                                        ]}
                                        delayPressIn={0}
                                        onPress={() => setSelectedMood(opt.value)}
                                    >
                                        <Ionicons name={opt.icon} size={16} color={isSelected ? '#9575cd' : theme.textSecondary} />
                                        <Text style={[styles.modalChipText, { color: theme.textSecondary }, isSelected && { color: '#9575cd', fontWeight: '700' }]}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.modalResetBtn, { borderColor: theme.border, borderWidth: 1 }]}
                            delayPressIn={0}
                            onPress={() => {
                                setSelectedFilter("latest");
                                setSelectedSort("recent");
                                setSelectedMood(null);
                                setShowAnonymousOnly(false);
                            }}
                        >
                            <Text style={[styles.modalResetText, { color: theme.text }]}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalApplyBtn, { backgroundColor: '#9575cd' }]}
                            delayPressIn={0}
                            onPress={onClose}
                        >
                            <Text style={styles.modalApplyText}>Apply Settings</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 40,
        paddingHorizontal: 20,
        maxHeight: "85%",
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalSection: {
        marginBottom: 20,
    },
    modalSectionTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 10,
    },
    modalChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    modalChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    modalChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    modalResetBtn: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalResetText: {
        fontSize: 15,
        fontWeight: '700',
    },
    modalApplyBtn: {
        flex: 2,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalApplyText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
