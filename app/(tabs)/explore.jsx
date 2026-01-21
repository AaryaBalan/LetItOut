import { Ionicons } from "@expo/vector-icons";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Explore() {
    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Explore</Text>
                <TouchableOpacity style={styles.notificationButton}>
                    <Ionicons
                        name="notifications-outline"
                        size={24}
                        color="#212121"
                    />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#9E9E9E" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="What's on your mind?"
                        placeholderTextColor="#BDBDBD"
                    />
                </View>

                {/* Trending Right Now */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Trending Right Now</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.trendingContainer}>
                        <TouchableOpacity style={styles.trendingTag}>
                            <Text style={styles.hashtagSymbol}>#</Text>
                            <Text style={styles.trendingText}>WorkLifeBalance</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.trendingTag}>
                            <Text style={styles.hashtagSymbol}>#</Text>
                            <Text style={styles.trendingText}>GriefSupport</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Categories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Categories</Text>

                    <View style={styles.categoriesGrid}>
                        {/* Stress - Finding Peace */}
                        <TouchableOpacity
                            style={[styles.categoryCard, styles.categoryPurple]}
                        >
                            <View style={[styles.categoryIcon, styles.iconPurple]}>
                                <Ionicons name="leaf" size={24} color="#6A1B9A" />
                            </View>
                            <View style={styles.categoryContent}>
                                <Text style={styles.categoryLabel}>STRESS</Text>
                                <Text style={styles.categoryTitle}>
                                    Finding{"\n"}Peace
                                </Text>
                            </View>
                            <View style={styles.decorationPurple1} />
                            <View style={styles.decorationPurple2} />
                            <View style={styles.decorationPurple3} />
                        </TouchableOpacity>

                        {/* Family - Navigating Relationships */}
                        <TouchableOpacity
                            style={[styles.categoryCard, styles.categoryPink]}
                        >
                            <View style={[styles.categoryIcon, styles.iconPink]}>
                                <Ionicons name="heart" size={24} color="#C2185B" />
                            </View>
                            <View style={styles.categoryContent}>
                                <Text style={styles.categoryLabel}>FAMILY</Text>
                                <Text style={styles.categoryTitle}>
                                    Navigating{"\n"}Relationships
                                </Text>
                            </View>
                            <View style={styles.decorationPink1} />
                            <View style={styles.decorationPink2} />
                        </TouchableOpacity>

                        {/* Mental Health - Daily Wellbeing */}
                        <TouchableOpacity
                            style={[styles.categoryCard, styles.categoryYellow]}
                        >
                            <View style={[styles.categoryIcon, styles.iconYellow]}>
                                <Ionicons name="fitness" size={24} color="#F57F17" />
                            </View>
                            <View style={styles.categoryContent}>
                                <Text style={styles.categoryLabel}>MENTAL HEALTH</Text>
                                <Text style={styles.categoryTitle}>
                                    Daily{"\n"}Wellbeing
                                </Text>
                            </View>
                            <View style={styles.decorationYellow1} />
                            <View style={styles.decorationYellow2} />
                        </TouchableOpacity>

                        {/* Work - Career & Purpose */}
                        <TouchableOpacity
                            style={[styles.categoryCard, styles.categoryBlue]}
                        >
                            <View style={[styles.categoryIcon, styles.iconBlue]}>
                                <Ionicons name="briefcase" size={24} color="#00695C" />
                            </View>
                            <View style={styles.categoryContent}>
                                <Text style={styles.categoryLabel}>WORK</Text>
                                <Text style={styles.categoryTitle}>
                                    Career &{"\n"}Purpose
                                </Text>
                            </View>
                            <View style={styles.decorationBlue1} />
                            <View style={styles.decorationBlue2} />
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
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
        fontSize: 32,
        fontWeight: "700",
        color: "#212121",
    },
    notificationButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    scrollView: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 24,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#212121",
    },
    section: {
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#212121",
    },
    seeAllText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#5DCCB4",
    },
    trendingContainer: {
        flexDirection: "row",
        gap: 12,
    },
    trendingTag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 24,
        gap: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    hashtagSymbol: {
        fontSize: 18,
        fontWeight: "700",
        color: "#5DCCB4",
    },
    trendingText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#212121",
    },
    categoriesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginTop: 8,
    },
    categoryCard: {
        width: "47%",
        aspectRatio: 1,
        borderRadius: 20,
        padding: 20,
        overflow: "hidden",
        position: "relative",
    },
    categoryPurple: {
        backgroundColor: "#B39DDB",
    },
    categoryPink: {
        backgroundColor: "#F8BBD0",
    },
    categoryYellow: {
        backgroundColor: "#FFE082",
    },
    categoryBlue: {
        backgroundColor: "#B2DFDB",
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    iconPurple: {
        backgroundColor: "#E1BEE7",
    },
    iconPink: {
        backgroundColor: "#FFFFFF",
    },
    iconYellow: {
        backgroundColor: "#FFFACD",
    },
    iconBlue: {
        backgroundColor: "#FFFFFF",
    },
    categoryContent: {
        flex: 1,
        justifyContent: "flex-end",
    },
    categoryLabel: {
        fontSize: 11,
        fontWeight: "700",
        color: "#616161",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    categoryTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#212121",
        lineHeight: 26,
    },
    // Decorative elements - Purple card
    decorationPurple1: {
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#9575CD",
        opacity: 0.4,
    },
    decorationPurple2: {
        position: "absolute",
        bottom: 50,
        right: 40,
        width: 20,
        height: 20,
        transform: [{ rotate: "45deg" }],
        backgroundColor: "#9575CD",
        opacity: 0.3,
    },
    decorationPurple3: {
        position: "absolute",
        bottom: 80,
        right: 60,
        width: 16,
        height: 16,
        transform: [{ rotate: "45deg" }],
        backgroundColor: "#9575CD",
        opacity: 0.3,
    },
    // Decorative elements - Pink card
    decorationPink1: {
        position: "absolute",
        bottom: 10,
        right: 15,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#F48FB1",
        opacity: 0.3,
    },
    decorationPink2: {
        position: "absolute",
        bottom: 20,
        right: 80,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#F48FB1",
        opacity: 0.25,
    },
    // Decorative elements - Yellow card
    decorationYellow1: {
        position: "absolute",
        bottom: 15,
        right: 20,
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#FFD54F",
        opacity: 0.3,
    },
    decorationYellow2: {
        position: "absolute",
        bottom: 40,
        right: 60,
        width: 35,
        height: 35,
        borderRadius: 18,
        backgroundColor: "#FFD54F",
        opacity: 0.25,
    },
    // Decorative elements - Blue card
    decorationBlue1: {
        position: "absolute",
        bottom: 10,
        right: 15,
        width: 75,
        height: 75,
        borderRadius: 38,
        backgroundColor: "#80CBC4",
        opacity: 0.3,
    },
    decorationBlue2: {
        position: "absolute",
        bottom: 50,
        right: 50,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#80CBC4",
        opacity: 0.25,
    },
});
