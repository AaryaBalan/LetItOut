import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Notification Collection Schema:
 * {
 *   type: 'like' | 'hug' | 'metoo' | 'comment'
 *   fromUserId: string
 *   fromUserName: string
 *   toUserId: string
 *   postId: string
 *   postTitle: string
 *   commentText: string (optional, only for comments)
 *   read: boolean
 *   createdAt: ISO string
 *   timestamp: Firestore serverTimestamp
 * }
 */

/**
 * Create a notification when someone likes a post
 */
export const createLikeNotification = async (
    postAuthorId,
    postId,
    postTitle,
    likerUserId,
    likerUserName,
) => {
    // Don't notify if user likes their own post
    if (postAuthorId === likerUserId) return;

    try {
        await addDoc(collection(db, "notifications"), {
            type: "like",
            fromUserId: likerUserId,
            fromUserName: likerUserName || "Anonymous",
            toUserId: postAuthorId,
            postId: String(postId),
            postTitle: postTitle,
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp(),
        });
        console.log("Like notification created");
    } catch (error) {
        console.error("Error creating like notification:", error);
    }
};

/**
 * Create a notification when someone sends a hug
 */
export const createHugNotification = async (
    postAuthorId,
    postId,
    postTitle,
    huggerUserId,
    huggerUserName,
) => {
    // Don't notify if user hugs their own post
    if (postAuthorId === huggerUserId) return;

    try {
        await addDoc(collection(db, "notifications"), {
            type: "hug",
            fromUserId: huggerUserId,
            fromUserName: huggerUserName || "Anonymous",
            toUserId: postAuthorId,
            postId: String(postId),
            postTitle: postTitle,
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp(),
        });
        console.log("Hug notification created");
    } catch (error) {
        console.error("Error creating hug notification:", error);
    }
};

/**
 * Create a notification when someone feels the same (me too)
 */
export const createMeTooNotification = async (
    postAuthorId,
    postId,
    postTitle,
    reactorUserId,
    reactorUserName,
) => {
    // Don't notify if user reacts to their own post
    if (postAuthorId === reactorUserId) return;

    try {
        await addDoc(collection(db, "notifications"), {
            type: "metoo",
            fromUserId: reactorUserId,
            fromUserName: reactorUserName || "Anonymous",
            toUserId: postAuthorId,
            postId: String(postId),
            postTitle: postTitle,
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp(),
        });
        console.log("Me too notification created");
    } catch (error) {
        console.error("Error creating me too notification:", error);
    }
};

/**
 * Create a notification when someone comments
 */
export const createCommentNotification = async (
    postAuthorId,
    postId,
    postTitle,
    commenterUserId,
    commenterUserName,
    commentText,
) => {
    // Don't notify if user comments on their own post
    if (postAuthorId === commenterUserId) return;

    try {
        await addDoc(collection(db, "notifications"), {
            type: "comment",
            fromUserId: commenterUserId,
            fromUserName: commenterUserName || "Anonymous",
            toUserId: postAuthorId,
            postId: String(postId),
            postTitle: postTitle,
            commentText: commentText,
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp(),
        });
        console.log("Comment notification created");
    } catch (error) {
        console.error("Error creating comment notification:", error);
    }
};

/**
 * Create a notification when someone sends a friend request
 */
export const createFriendRequestNotification = async (
    recipientId,
    senderId,
    senderName
) => {
    try {
        await addDoc(collection(db, "notifications"), {
            type: "friend_request",
            fromUserId: senderId,
            fromUserName: senderName || "Anonymous",
            toUserId: recipientId,
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp(),
        });
        console.log("Friend request notification created");
    } catch (error) {
        console.error("Error creating friend request notification:", error);
    }
};

/**
 * Create a notification when a friend request is accepted
 */
export const createFriendRequestAcceptedNotification = async (
    recipientId, // The person who sent the request (User A)
    accepterId,  // The person who accepted (User B)
    accepterName
) => {
    try {
        await addDoc(collection(db, "notifications"), {
            type: "friend_request_accepted",
            fromUserId: accepterId,
            fromUserName: accepterName || "Anonymous",
            toUserId: recipientId,
            read: false,
            createdAt: new Date().toISOString(),
            timestamp: serverTimestamp(),
        });
        console.log("Friend request accepted notification created");
    } catch (error) {
        console.error("Error creating friend request accepted notification:", error);
    }
};

/**
 * Create a notification when author's perspective changes, replacing/bumping existing notifications for the same comment
 */
export const createPerspectiveNotification = async (
    commenterUserId,
    postId,
    postTitle,
    authorUserId,
    authorUserName,
    rating,
    commentId
) => {
    // Don't notify if user is rating their own comments
    if (commenterUserId === authorUserId) return;

    try {
        const notificationsRef = collection(db, "notifications");
        
        // 1. Primary Query: Match specific commentId
        let q = query(
            notificationsRef,
            where("type", "==", "perspective_change"),
            where("postId", "==", String(postId)),
            where("commentId", "==", String(commentId))
        );
        let snapshot = await getDocs(q);

        // 2. Fallback Query: Match post & users (for legacy notifications without commentId)
        if (snapshot.empty) {
            const fallbackQuery = query(
                notificationsRef,
                where("type", "==", "perspective_change"),
                where("postId", "==", String(postId)),
                where("toUserId", "==", commenterUserId),
                where("fromUserId", "==", authorUserId)
            );
            snapshot = await getDocs(fallbackQuery);
        }

        if (!snapshot.empty) {
            // Update the existing notification document and bump it to the top
            const existingNotifId = snapshot.docs[0].id;
            const notifDocRef = doc(db, "notifications", existingNotifId);
            await updateDoc(notifDocRef, {
                rating: Number(rating),
                read: false,
                commentId: String(commentId), // Populate commentId for future primary matches
                createdAt: new Date().toISOString(),
                timestamp: serverTimestamp(),
            });
            console.log("Perspective notification updated and bumped to top");
        } else {
            // Create a new notification document
            await addDoc(collection(db, "notifications"), {
                type: "perspective_change",
                fromUserId: authorUserId,
                fromUserName: authorUserName || "Anonymous",
                toUserId: commenterUserId,
                postId: String(postId),
                postTitle: postTitle,
                commentId: String(commentId),
                rating: Number(rating),
                read: false,
                createdAt: new Date().toISOString(),
                timestamp: serverTimestamp(),
            });
            console.log("New perspective notification created");
        }
    } catch (error) {
        console.error("Error creating/updating perspective notification:", error);
    }
};


