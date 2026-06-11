import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";
import { TabBarProvider, useTabBar } from "../../context/TabBarContext";
import { useTheme } from "../../context/ThemeContext";

function TabsLayoutInner() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const { translateY } = useTabBar();
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    // Fetch total unread chats count
    useEffect(() => {
        if (!user) return;

        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("participants", "array-contains", user.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let totalUnread = 0;
            snapshot.docs.forEach((docSnap) => {
                const data = docSnap.data();
                const unreadCount = data.unreadCount || {};
                totalUnread += unreadCount[user.uid] || 0;
            });
            setUnreadChatCount(totalUnread);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <Tabs
            tabBar={(props) => (
                <Animated.View
                    style={[
                        styles.animatedTabBarContainer,
                        {
                            transform: [{ translateY }],
                        },
                    ]}
                >
                    <BottomTabBar {...props} />
                </Animated.View>
            )}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarActiveTintColor: "#9575cd",
                tabBarInactiveTintColor: theme.textTertiary,
                tabBarStyle: {
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: "600",
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Feed",
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialCommunityIcons
                            name={focused ? "home" : "home-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: "Chat",
                    tabBarIcon: ({ color, focused }) => (
                        <View>
                            <Ionicons
                                name={focused ? "chatbubble" : "chatbubble-outline"}
                                size={26}
                                color={color}
                            />
                            {unreadChatCount > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>
                                        {unreadChatCount > 9 ? "9+" : unreadChatCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: "Create",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "create" : "create-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Notifications",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "heart" : "heart-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "person" : "person-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}

export default function TabsLayout() {
    return (
        <TabBarProvider>
            <TabsLayoutInner />
        </TabBarProvider>
    );
}

const styles = StyleSheet.create({
    animatedTabBarContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 65,
        zIndex: 1000,
        elevation: 10,
    },
    badge: {
        position: "absolute",
        top: -4,
        right: -8,
        backgroundColor: "#FF5252",
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: "#FFFFFF",
    },
    badgeText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "bold",
    },
});
