import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
