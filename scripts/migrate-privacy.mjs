/**
 * Usage: node scripts/migrate-privacy.mjs --project PROJECT_ID [--apply]
 * Uses Application Default Credentials. Dry-run by default. Stop old clients before applying.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
const projectIndex = process.argv.indexOf('--project');
const projectId = projectIndex >= 0 ? process.argv[projectIndex + 1] : null;
if (!projectId || projectId.startsWith('--')) throw new Error('An explicit --project PROJECT_ID is required.');
initializeApp({ projectId, credential: applicationDefault() });
const db = getFirestore();
const apply = process.argv.includes('--apply');
const operations = [];
const [users, posts, reactions, comments, supports, chats] = await Promise.all(
  ['users','posts','reactions','comments','commentSupports','chats'].map(name => db.collection(name).get())
);
for (const user of users.docs) {
 const data = user.data();
 const publicProfile = {
  displayName: String(data.displayName || 'Member').slice(0,80),
  bio: String(data.bio || '').slice(0,1000),
  // Legacy avatars used email as their seed. Replace it, don't copy it into public data.
  profileCode: typeof data.profileCode === 'string' && !data.profileCode.includes('@') ? data.profileCode.slice(0,160) : user.id,
  photoURL: data.photoURL || null,
  createdAt: data.createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
 };
 operations.push(['set',db.doc(`publicProfiles/${user.id}`),publicProfile]);
 operations.push(['update',user.ref,{profileCode:publicProfile.profileCode}]);
}
const counts = new Map(posts.docs.map(p => [p.id,0]));
const commentCounts = new Map(comments.docs.map(c => [c.id,0]));
const commentsById = new Map(comments.docs.map(c => [c.id,c.data()]));
const uniqueReactions = new Map();
for (const record of reactions.docs) {
 const data = record.data();
 if (!data.postId || !data.userId || !['like','hug','metoo'].includes(data.type) || !counts.has(data.postId)) continue;
 const id = `${data.postId}_${data.userId}_${data.type}`;
 uniqueReactions.set(id,data);
 if (record.id !== id) operations.push(['delete',record.ref]);
}
for (const [id,data] of uniqueReactions) {
 operations.push(['set',db.doc(`reactions/${id}`),data]);
 counts.set(data.postId,counts.get(data.postId)+1);
}
for (const comment of comments.docs) {
 const id = comment.data().postId;
 if (counts.has(id)) counts.set(id,counts.get(id)+1);
}
const uniqueSupports = new Map();
for (const record of supports.docs) {
 const data = record.data();
 if (!data.userId || !commentsById.has(data.commentId)) continue;
 const id = `${data.commentId}_${data.userId}`;
 uniqueSupports.set(id,{...data,postId:commentsById.get(data.commentId).postId});
 if (record.id !== id) operations.push(['delete',record.ref]);
}
for (const [id,data] of uniqueSupports) {
 operations.push(['set',db.doc(`commentSupports/${id}`),data]);
 commentCounts.set(data.commentId,commentCounts.get(data.commentId)+1);
}
let unownedAnonymous = 0;
for (const post of posts.docs) {
 const data=post.data();
 operations.push(['update',post.ref,{reactionCount:counts.get(post.id)}]);
 if (data.authorId) {
  operations.push(['set',db.doc(`users/${data.authorId}/ownedPosts/${post.id}`),{createdAt:data.timestamp || FieldValue.serverTimestamp()}]);
  if (data.isAnonymous) operations.push(['update',post.ref,{authorId:FieldValue.delete(),authorName:'Anonymous'}]);
 } else if (data.isAnonymous) unownedAnonymous++;
}
for (const comment of comments.docs) operations.push(['update',comment.ref,{reactionCount:commentCounts.get(comment.id)}]);
for (const chat of chats.docs) {
 const participants=chat.data().participants;
 if (Array.isArray(participants) && participants.length===2) operations.push(['update',chat.ref,{participants:[...participants].sort()}]);
}
console.log(JSON.stringify({projectId,mode:apply?'APPLY':'DRY RUN',users:users.size,posts:posts.size,writes:operations.length,anonymousPostsWithoutRecoverableAuthor:unownedAnonymous},null,2));
if (apply) {
 // Migration requires a maintenance window: old SDK clients must not race this rewrite.
 for (let i=0;i<operations.length;i+=300) {
  const batch=db.batch();
  for (const [kind,ref,data] of operations.slice(i,i+300)) {
   if (kind==='delete') batch.delete(ref);
   else if (kind==='update') batch.update(ref,data);
   else batch.set(ref,data);
  }
  await batch.commit();
 }
 console.log('Migration completed. Deploy rules and the updated client together.');
} else console.log('No writes made. Review the counts and back up Firestore before using --apply.');
