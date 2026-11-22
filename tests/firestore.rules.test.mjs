import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, getDoc, getDocs, setDoc, updateDoc, writeBatch, serverTimestamp, query, where, deleteDoc } from 'firebase/firestore';
let env;
const db = uid => env.authenticatedContext(uid).firestore();
const post = (extra = {}) => ({ title: 'A thought', description: 'Some text', category: 'Other', authorId: 'alice', authorName: 'Alice', isAnonymous: false, helpNeeded: false, feelPercentage: 0, reactionCount: 0, createdAt: '2026-10-02', ...extra });
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-letitout', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }); });
after(async () => env?.cleanup());
beforeEach(async () => {
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx => {
  const d = ctx.firestore();
  await Promise.all([
   setDoc(doc(d,'users','alice'),{ email:'private@example.test', phoneNumber:'private' }),
   setDoc(doc(d,'publicProfiles','alice'),{ displayName:'Alice', profileCode:'avatar' }),
   setDoc(doc(d,'posts','post'),post()),
   setDoc(doc(d,'chats','alice_bob'),{participants:['alice','bob']}),
   setDoc(doc(d,'chats','alice_bob','messages','m'),{text:'private',senderId:'alice'}),
   setDoc(doc(d,'notifications','n'),{toUserId:'alice',fromUserId:'bob',read:false}),
   setDoc(doc(d,'comments','c'),{postId:'post',commentorId:'bob',comment:'reply',reactionCount:0}),
   setDoc(doc(d,'moodEntries','mood'),{userId:'alice'})
  ]);
 });
});
test('private account data is owner-only; public profile is allowlisted', async () => {
 await assertSucceeds(getDoc(doc(db('alice'),'users','alice')));
 await assertFails(getDoc(doc(db('bob'),'users','alice')));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'users','alice')));
 await assertSucceeds(getDoc(doc(db('bob'),'publicProfiles','alice')));
 await assertFails(updateDoc(doc(db('alice'),'publicProfiles','alice'),{email:'leak@example.test'}));
});
test('message membership, sender identity and participant immutability', async () => {
 await assertSucceeds(getDoc(doc(db('bob'),'chats','alice_bob','messages','m')));
 await assertFails(getDocs(collection(db('eve'),'chats','alice_bob','messages')));
 await assertFails(setDoc(doc(db('eve'),'chats','alice_bob','messages','new'),{text:'intrusion',senderId:'eve',createdAt:serverTimestamp()}));
 await assertFails(setDoc(doc(db('bob'),'chats','alice_bob','messages','new'),{text:'forged',senderId:'alice',createdAt:serverTimestamp()}));
 await assertSucceeds(setDoc(doc(db('bob'),'chats','alice_bob','messages','new'),{text:'hello',senderId:'bob',createdAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(db('bob'),'chats','alice_bob'),{participants:['bob','eve']}));
 await assertSucceeds(getDocs(query(collection(db('bob'),'chats'),where('participants','array-contains','bob'))));
});
test('first message and chat can be created atomically', async () => {
 const d=db('alice'), batch=writeBatch(d);
 batch.set(doc(d,'chats','alice_carol'),{participants:['alice','carol']});
 batch.set(doc(d,'chats','alice_carol','messages','first'),{text:'hello',senderId:'alice',createdAt:serverTimestamp()});
 await assertSucceeds(batch.commit());
 await assertFails(setDoc(doc(db('eve'),'chats','alice_dan'),{participants:['alice','dan']}));
});
test('notification queries cannot expose another inbox or forge senders', async () => {
 await assertFails(getDocs(collection(db('bob'),'notifications')));
 await assertSucceeds(getDocs(query(collection(db('alice'),'notifications'),where('toUserId','==','alice'))));
 await assertFails(updateDoc(doc(db('bob'),'notifications','n'),{read:true}));
 await assertSucceeds(updateDoc(doc(db('alice'),'notifications','n'),{read:true}));
 await assertFails(updateDoc(doc(db('alice'),'notifications','n'),{toUserId:'eve'}));
 await assertFails(setDoc(doc(db('bob'),'notifications','fake'),{fromUserId:'alice',toUserId:'eve',type:'like',read:false,timestamp:serverTimestamp()}));
});
test('anonymous ownership is private, cannot be claimed, and permits owner deletion', async () => {
 const d=db('alice'), batch=writeBatch(d);
 const data=post({isAnonymous:true,authorName:'Anonymous',timestamp:serverTimestamp()}); delete data.authorId;
 batch.set(doc(d,'posts','anon'),data);
 batch.set(doc(d,'users','alice','ownedPosts','anon'),{createdAt:serverTimestamp()});
 await assertSucceeds(batch.commit());
 await assertFails(getDoc(doc(db('bob'),'users','alice','ownedPosts','anon')));
 await assertFails(setDoc(doc(db('bob'),'users','bob','ownedPosts','anon'),{createdAt:serverTimestamp()}));
 await assertFails(deleteDoc(doc(db('bob'),'posts','anon')));
 await assertSucceeds(deleteDoc(doc(d,'posts','anon')));
});
test('post author spoofing, owner changes, arbitrary counters are rejected', async () => {
 const d=db('bob'), batch=writeBatch(d);
 batch.set(doc(d,'posts','forged'),post({timestamp:serverTimestamp()}));
 batch.set(doc(d,'users','bob','ownedPosts','forged'),{createdAt:serverTimestamp()});
 await assertFails(batch.commit());
 await assertFails(updateDoc(doc(db('alice'),'posts','post'),{authorId:'bob'}));
 await assertFails(updateDoc(doc(d,'posts','post'),{reactionCount:999}));
});
test('reaction requires a unique identity and atomic count update', async () => {
 const d=db('bob'), id='post_bob_like', ref=doc(d,'reactions',id);
 const data={postId:'post',userId:'bob',type:'like',timestamp:serverTimestamp()};
 await assertFails(setDoc(ref,data));
 const batch=writeBatch(d); batch.set(ref,data);batch.update(doc(d,'posts','post'),{reactionCount:1,lastInteraction:{id,kind:'reaction'}});
 await assertSucceeds(batch.commit());
 await assertFails(updateDoc(doc(d,'posts','post'),{reactionCount:2,lastInteraction:{id,kind:'reaction'}}));
 await assertFails(deleteDoc(ref));
 const remove=writeBatch(d);remove.delete(ref);remove.update(doc(d,'posts','post'),{reactionCount:0,lastInteraction:{id,kind:'reaction'}});
 await assertSucceeds(remove.commit());
});
test('comment author and atomic counter validation', async () => {
 const d=db('bob'), batch=writeBatch(d);
 batch.set(doc(d,'comments','reply'),{postId:'post',commentorId:'bob',comment:'Thanks',reactionCount:0,parentId:null,timestamp:serverTimestamp()});
 batch.update(doc(d,'posts','post'),{reactionCount:1,lastInteraction:{id:'reply',kind:'comment'}});
 await assertSucceeds(batch.commit());
 await assertFails(updateDoc(doc(d,'comments','reply'),{commentorId:'alice'}));
 await assertFails(updateDoc(doc(d,'comments','reply'),{perspectiveRating:30}));
 await assertSucceeds(updateDoc(doc(db('alice'),'comments','reply'),{perspectiveRating:30}));
 await assertFails(updateDoc(doc(db('alice'),'comments','reply'),{perspectiveRating:101}));
});
test('support counters require a matching unique support operation', async () => {
 const d=db('alice'),batch=writeBatch(d);
 batch.set(doc(d,'commentSupports','c_alice'),{commentId:'c',postId:'post',userId:'alice'});
 batch.update(doc(d,'comments','c'),{reactionCount:1,lastSupportId:'c_alice'});
 await assertSucceeds(batch.commit());
 await assertFails(updateDoc(doc(d,'comments','c'),{reactionCount:2,lastSupportId:'c_alice'}));
});
test('mood ownership is immutable', async () => {
 await assertFails(getDoc(doc(db('bob'),'moodEntries','mood')));
 await assertFails(updateDoc(doc(db('alice'),'moodEntries','mood'),{userId:'bob'}));
});
test('reports persist with a moderator-only review workflow', async () => {
 const ref=doc(db('alice'),'reports','r');
 await assertSucceeds(setDoc(ref,{reporterId:'alice',postId:'post',reason:'Harassment',status:'pending',createdAt:serverTimestamp()}));
 await assertFails(getDoc(doc(db('bob'),'reports','r')));
 await assertFails(updateDoc(ref,{status:'resolved',resolution:'self approved'}));
 const mod=env.authenticatedContext('mod',{moderator:true}).firestore();
 await assertSucceeds(getDocs(collection(mod,'reports')));
 await assertSucceeds(updateDoc(doc(mod,'reports','r'),{status:'resolved',resolution:'Reviewed'}));
});
test('recipient can handle a friend request but cannot edit its sender or body', async () => {
 await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(),'notifications','request'),{toUserId:'alice',fromUserId:'bob',type:'friend_request',read:false}));
 await assertSucceeds(updateDoc(doc(db('alice'),'notifications','request'),{read:true,status:'accepted'}));
 await assertFails(updateDoc(doc(db('alice'),'notifications','request'),{fromUserId:'eve'}));
 await assertSucceeds(setDoc(doc(db('bob'),'friends','request'),{followerId:'bob',followingId:'alice',status:0}));
 await assertSucceeds(updateDoc(doc(db('alice'),'friends','request'),{status:-1}));
 await assertFails(updateDoc(doc(db('alice'),'friends','request'),{followerId:'eve',status:1}));
});
test('an anonymous author can rate replies without publishing ownership', async () => {
 await env.withSecurityRulesDisabled(async ctx => {
  const d=ctx.firestore();
  await setDoc(doc(d,'posts','anon'),post({authorId:null,isAnonymous:true,authorName:'Anonymous'}));
  await setDoc(doc(d,'users','alice','ownedPosts','anon'),{createdAt:'now'});
  await setDoc(doc(d,'comments','anonReply'),{postId:'anon',commentorId:'bob',reactionCount:0});
 });
 await assertSucceeds(updateDoc(doc(db('alice'),'comments','anonReply'),{perspectiveRating:-60}));
 await assertFails(updateDoc(doc(db('bob'),'comments','anonReply'),{perspectiveRating:40}));
 await assertFails(setDoc(doc(db('alice'),'notifications','leak'),{type:'perspective_change',fromUserId:'alice',toUserId:'bob',postId:'anon',commentId:'anonReply',rating:20,read:false,timestamp:serverTimestamp()}));
});
test('chat initialization and unread reset work without replacing participants', async () => {
 await assertSucceeds(setDoc(doc(db('bob'),'chats','alice_bob'),{participants:['alice','bob']},{merge:true}));
 await assertSucceeds(setDoc(doc(db('bob'),'chats','alice_bob'),{unreadCount_bob:0},{merge:true}));
 await assertFails(setDoc(doc(db('eve'),'chats','alice_bob'),{unreadCount_eve:0},{merge:true}));
});
test('public profile rejects email-based avatar seeds', async () => {
 await assertFails(updateDoc(doc(db('alice'),'publicProfiles','alice'),{profileCode:'private@example.test'}));
 await assertSucceeds(updateDoc(doc(db('alice'),'publicProfiles','alice'),{profileCode:'avatar-seed|#EFE8FF',bio:'Hello'}));
});
test('notifications must reference an action by the sender toward the recipient', async () => {
 const d=db('bob');
 const notification={type:'like',fromUserId:'bob',toUserId:'alice',postId:'post',read:false,timestamp:serverTimestamp()};
 await assertFails(setDoc(doc(d,'notifications','invented'),notification));
 await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(),'reactions','post_bob_like'),{postId:'post',userId:'bob',type:'like'}));
 await assertSucceeds(setDoc(doc(d,'notifications','valid'),notification));
 await assertFails(setDoc(doc(d,'notifications','wrongRecipient'),{...notification,toUserId:'eve'}));
 await assertSucceeds(setDoc(doc(d,'notifications','reply'),{type:'comment',fromUserId:'bob',toUserId:'alice',postId:'post',commentId:'c',read:false,timestamp:serverTimestamp()}));
});
test('migration dry run is read-only; applying deduplicates and preserves private data', async () => {
 const { execFile } = await import('node:child_process');
 const { promisify } = await import('node:util');
 const run=promisify(execFile);
 await env.withSecurityRulesDisabled(async ctx => {
  const d=ctx.firestore();
  await updateDoc(doc(d,'users','alice'),{displayName:'Alice',profileCode:'private@example.test',savedPosts:['post']});
  await setDoc(doc(d,'reactions','old1'),{postId:'post',userId:'bob',type:'like'});
  await setDoc(doc(d,'reactions','old2'),{postId:'post',userId:'bob',type:'like'});
  await setDoc(doc(d,'commentSupports','oldSupport'),{commentId:'c',userId:'alice'});
 });
 const args=['scripts/migrate-privacy.mjs','--project','demo-letitout'];
 const dry=await run(process.execPath,args,{timeout:30000});
 if (!dry.stdout.includes('DRY RUN')) throw new Error('Expected dry run');
 await env.withSecurityRulesDisabled(async ctx => {
  const p=await getDoc(doc(ctx.firestore(),'publicProfiles','alice'));
  if(p.data().profileCode!=='avatar') throw new Error('Dry run changed a profile');
 });
 await run(process.execPath,[...args,'--apply'],{timeout:30000});
 await run(process.execPath,[...args,'--apply'],{timeout:30000});
 await env.withSecurityRulesDisabled(async ctx => {
  const d=ctx.firestore();
  const profile=(await getDoc(doc(d,'publicProfiles','alice'))).data();
  if ('email' in profile || 'savedPosts' in profile || profile.profileCode.includes('@')) throw new Error('Private profile fields leaked');
  if ((await getDoc(doc(d,'users','alice'))).data().email!=='private@example.test') throw new Error('Private email lost');
  if ((await getDocs(collection(d,'reactions'))).size!==1) throw new Error('Reaction deduplication failed');
  if ((await getDoc(doc(d,'posts','post'))).data().reactionCount!==2) throw new Error('Counter is not reactions plus comments');
  if (!(await getDoc(doc(d,'users','alice','ownedPosts','post'))).exists()) throw new Error('Ownership missing');
  if ((await getDoc(doc(d,'commentSupports','c_alice'))).data().postId!=='post') throw new Error('Support post ID missing');
 });
});
