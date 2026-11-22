import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function toggleReaction(postId, user, type, existingId) {
  const postRef = doc(db, 'posts', postId);
  const ref = doc(db, 'reactions', existingId || `${postId}_${user.uid}_${type}`);
  return runTransaction(db, async tx => {
    const [post, reaction] = await Promise.all([tx.get(postRef), tx.get(ref)]);
    if (!post.exists()) throw new Error('This post is no longer available.');
    const removing = reaction.exists();
    if (removing) tx.delete(ref);
    else tx.set(ref, { postId, userId: user.uid, userName: user.displayName || 'Anonymous', type, timestamp: serverTimestamp(), createdAt: new Date().toISOString() });
    tx.update(postRef, { reactionCount: Math.max(0, post.data().reactionCount || 0) + (removing ? -1 : 1), lastInteraction: { id: ref.id, kind: 'reaction' } });
    return !removing;
  });
}

export async function addComment(postId, user, comment, parentId = null) {
  const postRef = doc(db, 'posts', postId);
  const ref = doc(collection(db, 'comments'));
  await runTransaction(db, async tx => {
    const post = await tx.get(postRef);
    if (!post.exists()) throw new Error('This post is no longer available.');
    tx.set(ref, { postId, commentorId: user.uid, commentorName: user.displayName || 'Anonymous', comment,
      parentId, reactionCount: 0, timestamp: serverTimestamp(), createdAt: new Date().toISOString() });
    tx.update(postRef, { reactionCount: (post.data().reactionCount || 0) + 1, lastInteraction: { id: ref.id, kind: 'comment' } });
  });
  return ref.id;
}

export async function toggleCommentSupport(commentId, postId, user, existingId) {
  const commentRef = doc(db, 'comments', commentId);
  const ref = doc(db, 'commentSupports', existingId || `${commentId}_${user.uid}`);
  await runTransaction(db, async tx => {
    const [comment, support] = await Promise.all([tx.get(commentRef), tx.get(ref)]);
    if (!comment.exists()) throw new Error('This reply is no longer available.');
    if (support.exists()) tx.delete(ref);
    else tx.set(ref, { commentId, postId, userId: user.uid, userName: user.displayName || 'Anonymous', timestamp: serverTimestamp(), createdAt: new Date().toISOString() });
    tx.update(commentRef, { reactionCount: (comment.data().reactionCount || 0) + (support.exists() ? -1 : 1), lastSupportId: ref.id });
  });
}
