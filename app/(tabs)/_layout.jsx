import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { db } from "../../config/firebase";
import { useAuth } from "../../context/AuthContext";

export default function TabsLayout() {
    const { user } = useAuth();
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    // Fetch total unread chats count
    useEffect(() => {
        if (!user) return;

        const chatsRef = collection(db, "chats");
        const q = query(chatsRef, where("participants", "array-contains", user.uid));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let totalUnread = 0;
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const count = data[`unreadCount_${user.uid}`] || 0;
                totalUnread += count;
            });
            setUnreadChatCount(totalUnread);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarActiveTintColor: "#9575cd",
                tabBarInactiveTintColor: "#BDBDBD",
                tabBarStyle: {
                    backgroundColor: "#FFFFFF",
                    borderTopWidth: 1,
                    borderTopColor: "#E0E0E0",
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
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? "home" : "home-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: "Explore",
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? "compass" : "compass-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: "",
                    tabBarIcon: ({ color, size }) => (
                        <View style={styles.createButton}>
                            <Ionicons name="add" size={32} color="#FFFFFF" />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: "Chat",
                    tabBarIcon: ({ color, size, focused }) => (
                        <View>
                            <Ionicons
                                name={focused ? "chatbubbles" : "chatbubbles-outline"}
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
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size, focused }) => (
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

const styles = StyleSheet.create({
    createButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#9575cd",
        justifyContent: "center",
        alignItems: "center",
        marginTop: -20,
        shadowColor: "#9575cd",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
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
