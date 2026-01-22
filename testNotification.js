import { initializeApp } from "firebase/app";
import {
    addDoc,
    collection,
    getFirestore,
    serverTimestamp,
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA65RlWsspLIG8UAI7zNmpV54cKsslW8Iw",
    authDomain: "let-itout.firebaseapp.com",
    projectId: "let-itout",
    storageBucket: "let-itout.firebasestorage.app",
    messagingSenderId: "976666516752",
    appId: "1:976666516752:web:14f5384283caa7b4d69995",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Script to add dummy notification data to Firebase
 * Run: node testNotification.js
 */
async function createDummyNotifications() {
    try {
        console.log("🔥 Creating dummy notifications...\n");

        // Replace this with your actual user ID from Firebase Authentication
        const YOUR_USER_ID = "YOUR_USER_ID_HERE"; // ⚠️ CHANGE THIS!

        // Notification 1: Like
        await addDoc(collection(db, "notifications"), {
            type: "like",
            fromUserId: "dummy_user_1",
            fromUserName: "John Doe",
            toUserId: YOUR_USER_ID,
            postId: "dummy_post_123",
            postTitle: "Feeling overwhelmed with studies",
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp(),
        });
        console.log("✅ Created Like notification");

        // Notification 2: Hug
        await addDoc(collection(db, "notifications"), {
            type: "hug",
            fromUserId: "dummy_user_2",
            fromUserName: "Jane Smith",
            toUserId: YOUR_USER_ID,
            postId: "dummy_post_123",
            postTitle: "Feeling overwhelmed with studies",
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
            timestamp: serverTimestamp(),
        });
        console.log("✅ Created Hug notification");

        // Notification 3: Me Too
        await addDoc(collection(db, "notifications"), {
            type: "metoo",
            fromUserId: "dummy_user_3",
            fromUserName: "Alex Johnson",
            toUserId: YOUR_USER_ID,
            postId: "dummy_post_456",
            postTitle: "Struggling with anxiety",
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
            timestamp: serverTimestamp(),
        });
        console.log("✅ Created Me Too notification");

        // Notification 4: Comment
        await addDoc(collection(db, "notifications"), {
            type: "comment",
            fromUserId: "dummy_user_4",
            fromUserName: "Sarah Williams",
            toUserId: YOUR_USER_ID,
            postId: "dummy_post_789",
            postTitle: "Need help with mental health",
            commentText: "You're not alone! We're here for you 💙",
            read: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
            timestamp: serverTimestamp(),
        });
        console.log("✅ Created Comment notification");

        console.log("\n🎉 All dummy notifications created successfully!");
        console.log("📱 Open your app and go to Inbox to see them!");
        console.log(
            "\n⚠️  Remember to replace YOUR_USER_ID_HERE with your actual Firebase user ID",
        );

        process.exit(0);
    } catch (error) {
        console.error("❌ Error creating notifications:", error);
        process.exit(1);
    }
}

// Run the script
createDummyNotifications();
