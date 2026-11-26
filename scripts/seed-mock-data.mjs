import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Firebase token
const configPath = path.join(process.env.HOME, '.config/configstore/firebase-tools.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const token = cfg.tokens.access_token;
const projectId = 'let-itout';

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) {
      fields[k] = toFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

async function setDoc(docPath, data) {
  const fields = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toFirestoreValue(v);
  }
  const url = `${BASE_URL}/${docPath}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to set ${docPath} (${res.status}): ${text}`);
  }
  return res.json();
}

console.log('🌱 Starting database seeding for LetItOut...\n');

// 1. User Profiles
const USERS = [
  {
    uid: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
    displayName: 'Aarya Balan',
    email: 'aaryabalan2006@gmail.com',
    profileCode: 'Aarya Balan',
    bio: 'Founder of LetItOut 🚀 Passionate about mental wellness, tech, and building supportive communities.',
    photoURL: 'https://lh3.googleusercontent.com/a/ACg8ocLgzCzs2bG_plQs7-U2X3TAuDQpV-6Wt7Izf3YoMH2iegvC4zEc=s96-c',
    postCount: 3,
    loveSent: 15,
  },
  {
    uid: '5hYHcsJGkEZpepMfrEg0t4GKHdP2',
    displayName: 'Priya Sharma',
    email: 'priya@gmail.com',
    profileCode: 'Priya',
    bio: 'Psychology student & tea enthusiast ☕ Always here to listen, support, and lend a warm hug.',
    photoURL: null,
    postCount: 2,
    loveSent: 12,
  },
  {
    uid: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2',
    displayName: 'Janvi Patel',
    email: 'janvi@gmail.com',
    profileCode: 'Janvi',
    bio: 'Navigating life one breath at a time. Plant mom & artist 🌿🎨',
    photoURL: null,
    postCount: 2,
    loveSent: 8,
  },
  {
    uid: 'PyYwXkY1bnQZimLP6FLYg7W7vto1',
    displayName: 'Kural Arasan',
    email: 'kural@gmail.com',
    profileCode: 'Kural',
    bio: 'Software dev & avid reader 📚 Believer in open thoughts and second chances.',
    photoURL: null,
    postCount: 2,
    loveSent: 9,
  },
  {
    uid: 'TP5bvyQaW0Rjb4BRr0dvUlNXEr02',
    displayName: 'Sam Francis',
    email: 'samfrancis9551@gmail.com',
    profileCode: 'Sam',
    bio: 'Music producer & night owl 🎧 Finding solace in melodies and late night chats.',
    photoURL: null,
    postCount: 1,
    loveSent: 5,
  },
  {
    uid: 'fcMRF8jBaYMbUpEEwemcZTVx3C62',
    displayName: 'Chandran K',
    email: 'chandran@gmail.com',
    profileCode: 'Chandran',
    bio: 'Engineering student striving to balance intense deadlines with good mental health.',
    photoURL: null,
    postCount: 1,
    loveSent: 4,
  },
  {
    uid: 'pt3iyhuWUOP2Ma2B5475oRP8Xos1',
    displayName: 'Rhea Sen',
    email: 'asteroidteams@gmail.com',
    profileCode: 'Rhea',
    bio: 'Mindfulness practitioner & community guide. You are stronger than you think ✨',
    photoURL: 'https://lh3.googleusercontent.com/a/ACg8ocJSEd0zdpJmJ6c16cit4RfsB6X3newteL3KnFPOlWsAZJ1Osw=s96-c',
    postCount: 1,
    loveSent: 10,
  },
];

console.log('1️⃣ Creating User Profiles in /users and /publicProfiles...');
const now = new Date();
for (const u of USERS) {
  const publicData = {
    displayName: u.displayName,
    profileCode: u.profileCode,
    bio: u.bio,
    photoURL: u.photoURL,
    createdAt: now,
    updatedAt: now,
  };
  const privateData = {
    ...publicData,
    email: u.email,
    loveSent: u.loveSent,
    postCount: u.postCount,
  };
  await setDoc(`publicProfiles/${u.uid}`, publicData);
  await setDoc(`users/${u.uid}`, privateData);
}
console.log(`   ✓ Created ${USERS.length} user profiles.`);

// 2. Friends Network
console.log('\n2️⃣ Creating Friends connections with Aarya...');
const FRIENDS = [
  { followerId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2', followingId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', status: 1 }, // Priya (Accepted)
  { followerId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', followingId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2', status: 1 },
  { followerId: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2', followingId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', status: 1 }, // Janvi (Accepted)
  { followerId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', followingId: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2', status: 1 },
  { followerId: 'PyYwXkY1bnQZimLP6FLYg7W7vto1', followingId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', status: 1 }, // Kural (Accepted)
  { followerId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', followingId: 'PyYwXkY1bnQZimLP6FLYg7W7vto1', status: 1 },
  { followerId: 'TP5bvyQaW0Rjb4BRr0dvUlNXEr02', followingId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', status: 1 }, // Sam (Accepted)
  { followerId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', followingId: 'TP5bvyQaW0Rjb4BRr0dvUlNXEr02', status: 1 },
  { followerId: 'fcMRF8jBaYMbUpEEwemcZTVx3C62', followingId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', status: 0 }, // Chandran (Requested)
];

for (let i = 0; i < FRIENDS.length; i++) {
  const f = FRIENDS[i];
  await setDoc(`friends/friend_${i + 1}`, {
    ...f,
    createdAt: now,
  });
}
console.log(`   ✓ Created ${FRIENDS.length} friendship records.`);

// 3. Posts
console.log('\n3️⃣ Creating Posts across diverse categories...');
const POSTS = [
  {
    id: 'post_aarya_mental_health',
    title: 'The courage to take a step back and breathe',
    description: 'For months I kept pushing forward without listening to my body. I thought pausing meant falling behind. Today I took an entire afternoon just walking in nature without my phone. It reminded me that resting isn’t giving up—it’s recharging so you can keep showing up as your true self.',
    category: 'Mental Health',
    authorId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
    authorName: 'Aarya Balan',
    isAnonymous: false,
    helpNeeded: false,
    feelPercentage: 45,
    reactionCount: 6,
    commentCount: 3,
    reactions: { like: 3, hug: 2, metoo: 1 },
    createdAt: new Date(Date.now() - 3600 * 1000 * 3), // 3 hours ago
    timestamp: new Date(Date.now() - 3600 * 1000 * 3),
  },
  {
    id: 'post_aarya_anon_stress',
    title: 'Sometimes I put on a smile so nobody worries',
    description: 'When people ask me "How are you doing?", I automatically reply "All good!". But inside, I feel overwhelmed by deadlines, expectations, and the constant fear of not meeting them. Posting here because it feels like the only safe space where I don’t have to pretend.',
    category: 'Stress',
    authorId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', // linked to Aarya in ownedPosts
    authorName: 'Anonymous',
    isAnonymous: true,
    helpNeeded: true,
    feelPercentage: -60,
    reactionCount: 8,
    commentCount: 4,
    reactions: { like: 1, hug: 5, metoo: 2 },
    createdAt: new Date(Date.now() - 3600 * 1000 * 8), // 8 hours ago
    timestamp: new Date(Date.now() - 3600 * 1000 * 8),
  },
  {
    id: 'post_priya_study',
    title: 'Exam anxiety is peaking, but remember: grades don’t define your worth',
    description: 'Seeing so many of my batchmates stressed about final semester tests. Yes, preparation matters, but so does your sleep and your peace of mind. Give it your sincere shot and let go of the outcome. You are so much more than a GPA.',
    category: 'Study',
    authorId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2',
    authorName: 'Priya Sharma',
    isAnonymous: false,
    helpNeeded: false,
    feelPercentage: 35,
    reactionCount: 5,
    commentCount: 2,
    reactions: { like: 3, hug: 2, metoo: 0 },
    createdAt: new Date(Date.now() - 3600 * 1000 * 18), // 18 hours ago
    timestamp: new Date(Date.now() - 3600 * 1000 * 18),
  },
  {
    id: 'post_janvi_family',
    title: 'Finally had that honest conversation with my parents',
    description: 'For two years I was afraid of telling them I wanted to pursue design instead of traditional finance. Today we sat down for tea and I walked them through my portfolio. To my surprise, they held my hand and said they just wanted me to be happy. Don’t bottle things up—sometimes love understands more than we expect.',
    category: 'Family',
    authorId: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2',
    authorName: 'Janvi Patel',
    isAnonymous: false,
    helpNeeded: false,
    feelPercentage: 80,
    reactionCount: 9,
    commentCount: 3,
    reactions: { like: 6, hug: 3, metoo: 0 },
    createdAt: new Date(Date.now() - 3600 * 1000 * 26), // 1 day ago
    timestamp: new Date(Date.now() - 3600 * 1000 * 26),
  },
  {
    id: 'post_kural_relationship',
    title: 'Learning the beauty of solitude over loneliness',
    description: 'After a rough breakup, quiet evenings felt unbearable. But slowly, I turned that quiet time into cooking meals for myself, listening to ambient music, and rediscovering old hobbies. Solitude is peaceful when you start enjoying your own company.',
    category: 'Relationship',
    authorId: 'PyYwXkY1bnQZimLP6FLYg7W7vto1',
    authorName: 'Kural Arasan',
    isAnonymous: false,
    helpNeeded: false,
    feelPercentage: 15,
    reactionCount: 4,
    commentCount: 2,
    reactions: { like: 2, hug: 2, metoo: 0 },
    createdAt: new Date(Date.now() - 3600 * 1000 * 40),
    timestamp: new Date(Date.now() - 3600 * 1000 * 40),
  },
  {
    id: 'post_sam_other',
    title: 'The healing power of sound and rainy nights',
    description: 'Sitting by the window listening to rain drops hitting the roof while working on lo-fi chords. Music has been my anchor through the darkest seasons. If you are having a rough night, put on your favorite headphones and let the melody carry you.',
    category: 'Other',
    authorId: 'TP5bvyQaW0Rjb4BRr0dvUlNXEr02',
    authorName: 'Sam Francis',
    isAnonymous: false,
    helpNeeded: false,
    feelPercentage: 65,
    reactionCount: 7,
    commentCount: 2,
    reactions: { like: 4, hug: 2, metoo: 1 },
    createdAt: new Date(Date.now() - 3600 * 1000 * 55),
    timestamp: new Date(Date.now() - 3600 * 1000 * 55),
  },
  {
    id: 'post_chandran_study',
    title: 'Burnout caught up with me right before project submission',
    description: 'Pulled three consecutive all-nighters for our capstone project and today my mind completely crashed. Couldn’t write a single line of code. Taking a full day of sleep before touching my laptop again. Please prioritize your physical health over deadlines.',
    category: 'Study',
    authorId: 'fcMRF8jBaYMbUpEEwemcZTVx3C62',
    authorName: 'Chandran K',
    isAnonymous: false,
    helpNeeded: true,
    feelPercentage: -70,
    reactionCount: 6,
    commentCount: 3,
    reactions: { like: 1, hug: 4, metoo: 1 },
    createdAt: new Date(Date.now() - 3600 * 1000 * 70),
    timestamp: new Date(Date.now() - 3600 * 1000 * 70),
  },
];

for (const p of POSTS) {
  const { id, ...data } = p;
  await setDoc(`posts/${id}`, data);
}
console.log(`   ✓ Created ${POSTS.length} posts.`);

// Add Aarya's owned posts in users/uid/ownedPosts subcollection
console.log("\n   ↳ Adding Aarya's owned posts subcollection (My Center)...");
await setDoc('users/u8NHuSP15PP3lGq5VYloEKDnglf2/ownedPosts/post_aarya_mental_health', { createdAt: now });
await setDoc('users/u8NHuSP15PP3lGq5VYloEKDnglf2/ownedPosts/post_aarya_anon_stress', { createdAt: now });

// 4. Comments
console.log('\n4️⃣ Creating Comments & supportive replies...');
const COMMENTS = [
  // Comments on Aarya's mental health post
  {
    id: 'comm_1',
    postId: 'post_aarya_mental_health',
    commentorId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2',
    commentorName: 'Priya Sharma',
    comment: 'So proud of you for recognizing that boundary Aarya! Taking time off without screens is genuinely healing.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2),
    timestamp: new Date(Date.now() - 3600 * 1000 * 2),
    reactionCount: 2,
    parentId: null,
  },
  {
    id: 'comm_2',
    postId: 'post_aarya_mental_health',
    commentorId: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2',
    commentorName: 'Janvi Patel',
    comment: 'Needed to read this today. Sometimes we get caught in the hustle trap and forget that rest is productive too.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 2),
    timestamp: new Date(Date.now() - 3600 * 1000 * 2),
    reactionCount: 1,
    parentId: null,
  },
  {
    id: 'comm_3',
    postId: 'post_aarya_mental_health',
    commentorId: 'PyYwXkY1bnQZimLP6FLYg7W7vto1',
    commentorName: 'Kural Arasan',
    comment: 'Nature walks are undefeated for clearing mental clutter. Keep shining bro!',
    createdAt: new Date(Date.now() - 3600 * 1000 * 1),
    timestamp: new Date(Date.now() - 3600 * 1000 * 1),
    reactionCount: 0,
    parentId: null,
  },

  // Comments on Aarya's anonymous stress post
  {
    id: 'comm_4',
    postId: 'post_aarya_anon_stress',
    commentorId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2',
    commentorName: 'Priya Sharma',
    comment: 'Sending you the biggest virtual hug. It is completely okay to not be okay. Please give yourself permission to be human.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 7),
    timestamp: new Date(Date.now() - 3600 * 1000 * 7),
    reactionCount: 3,
    parentId: null,
  },
  {
    id: 'comm_5',
    postId: 'post_aarya_anon_stress',
    commentorId: 'TP5bvyQaW0Rjb4BRr0dvUlNXEr02',
    commentorName: 'Sam Francis',
    comment: 'I feel this deeply. We wear masks all day long. Take a deep breath—you are doing great and you are not alone.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 6),
    timestamp: new Date(Date.now() - 3600 * 1000 * 6),
    reactionCount: 1,
    parentId: null,
  },

  // Comments on Priya's study post
  {
    id: 'comm_6',
    postId: 'post_priya_study',
    commentorId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
    commentorName: 'Aarya Balan',
    comment: 'Golden advice Priya! Five years from now nobody will remember the exam scores, but healthy habits stay forever.',
    createdAt: new Date(Date.now() - 3600 * 1000 * 16),
    timestamp: new Date(Date.now() - 3600 * 1000 * 16),
    reactionCount: 2,
    parentId: null,
  },

  // Comments on Janvi's family post
  {
    id: 'comm_7',
    postId: 'post_janvi_family',
    commentorId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
    commentorName: 'Aarya Balan',
    comment: 'This made me smile so wide Janvi! Congratulations on speaking your truth, you are going to create incredible designs ✨',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24),
    timestamp: new Date(Date.now() - 3600 * 1000 * 24),
    reactionCount: 2,
    parentId: null,
  },

  // Comments on Chandran's study burnout post
  {
    id: 'comm_8',
    postId: 'post_chandran_study',
    commentorId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
    commentorName: 'Aarya Balan',
    comment: 'Bro, close that IDE and sleep for 12 hours. The code will still be there tomorrow, but your health comes first!',
    createdAt: new Date(Date.now() - 3600 * 1000 * 68),
    timestamp: new Date(Date.now() - 3600 * 1000 * 68),
    reactionCount: 2,
    parentId: null,
  },
];

for (const c of COMMENTS) {
  const { id, ...data } = c;
  await setDoc(`comments/${id}`, data);
}
console.log(`   ✓ Created ${COMMENTS.length} comments.`);

// 5. Reactions
console.log('\n5️⃣ Creating Reactions (likes, hugs, metoo)...');
const REACTIONS = [
  // Reactions to Aarya's mental health post
  { postId: 'post_aarya_mental_health', userId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2', userName: 'Priya Sharma', type: 'hug' },
  { postId: 'post_aarya_mental_health', userId: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2', userName: 'Janvi Patel', type: 'like' },
  { postId: 'post_aarya_mental_health', userId: 'PyYwXkY1bnQZimLP6FLYg7W7vto1', userName: 'Kural Arasan', type: 'like' },
  { postId: 'post_aarya_mental_health', userId: 'TP5bvyQaW0Rjb4BRr0dvUlNXEr02', userName: 'Sam Francis', type: 'like' },
  { postId: 'post_aarya_mental_health', userId: 'fcMRF8jBaYMbUpEEwemcZTVx3C62', userName: 'Chandran K', type: 'metoo' },
  { postId: 'post_aarya_mental_health', userId: 'pt3iyhuWUOP2Ma2B5475oRP8Xos1', userName: 'Rhea Sen', type: 'hug' },

  // Reactions to Aarya's anon stress post
  { postId: 'post_aarya_anon_stress', userId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2', userName: 'Priya Sharma', type: 'hug' },
  { postId: 'post_aarya_anon_stress', userId: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2', userName: 'Janvi Patel', type: 'hug' },
  { postId: 'post_aarya_anon_stress', userId: 'PyYwXkY1bnQZimLP6FLYg7W7vto1', userName: 'Kural Arasan', type: 'hug' },
  { postId: 'post_aarya_anon_stress', userId: 'TP5bvyQaW0Rjb4BRr0dvUlNXEr02', userName: 'Sam Francis', type: 'metoo' },

  // Aarya's reactions to others
  { postId: 'post_priya_study', userId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', userName: 'Aarya Balan', type: 'like' },
  { postId: 'post_janvi_family', userId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', userName: 'Aarya Balan', type: 'like' },
  { postId: 'post_kural_relationship', userId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', userName: 'Aarya Balan', type: 'hug' },
  { postId: 'post_chandran_study', userId: 'u8NHuSP15PP3lGq5VYloEKDnglf2', userName: 'Aarya Balan', type: 'hug' },
];

for (const r of REACTIONS) {
  const reactionId = `${r.postId}_${r.userId}_${r.type}`;
  await setDoc(`reactions/${reactionId}`, {
    ...r,
    createdAt: now,
    timestamp: now,
  });
}
console.log(`   ✓ Created ${REACTIONS.length} reaction records.`);

// 6. Chats and Direct Messages
console.log('\n6️⃣ Creating Chats and Multi-turn Messages...');

// Helper to seed a chat
async function createChatWithMessages(userA, userB, messages) {
  const chatId = [userA.uid, userB.uid].sort().join('_');
  const lastMsg = messages[messages.length - 1];

  await setDoc(`chats/${chatId}`, {
    participants: [userA.uid, userB.uid].sort(),
    lastMessage: lastMsg.text,
    lastMessageTimestamp: lastMsg.time,
    updatedAt: lastMsg.time,
    [`unreadCount_${userA.uid}`]: 0,
    [`unreadCount_${userB.uid}`]: 0,
  });

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    await setDoc(`chats/${chatId}/messages/msg_${i + 1}`, {
      text: m.text,
      senderId: m.senderId,
      senderName: m.senderName,
      createdAt: m.time,
    });
  }
}

// Chat 1: Aarya & Priya
await createChatWithMessages(
  USERS[0], // Aarya
  USERS[1], // Priya
  [
    {
      senderId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2',
      senderName: 'Priya Sharma',
      text: 'Hey Aarya! How are you holding up with the new release?',
      time: new Date(Date.now() - 3600 * 1000 * 5),
    },
    {
      senderId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
      senderName: 'Aarya Balan',
      text: 'Hey Priya! Feeling much better now that everything is running smoothly and clean.',
      time: new Date(Date.now() - 3600 * 1000 * 4),
    },
    {
      senderId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2',
      senderName: 'Priya Sharma',
      text: 'So glad to hear that! Remember to take breaks and stay hydrated 🍵',
      time: new Date(Date.now() - 3600 * 1000 * 3),
    },
    {
      senderId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
      senderName: 'Aarya Balan',
      text: 'Definitely will! Thanks for checking in, it really means a lot.',
      time: new Date(Date.now() - 3600 * 1000 * 2),
    },
    {
      senderId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2',
      senderName: 'Priya Sharma',
      text: 'Always here for you! Have a restful evening ✨',
      time: new Date(Date.now() - 3600 * 1000 * 1),
    },
  ]
);

// Chat 2: Aarya & Kural
await createChatWithMessages(
  USERS[0], // Aarya
  USERS[3], // Kural
  [
    {
      senderId: 'PyYwXkY1bnQZimLP6FLYg7W7vto1',
      senderName: 'Kural Arasan',
      text: 'Yo Aarya bro, loved that post you shared about taking a breather.',
      time: new Date(Date.now() - 3600 * 1000 * 6),
    },
    {
      senderId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
      senderName: 'Aarya Balan',
      text: 'Thanks man! It took me a while to realize burning out doesn’t solve anything.',
      time: new Date(Date.now() - 3600 * 1000 * 5),
    },
    {
      senderId: 'PyYwXkY1bnQZimLP6FLYg7W7vto1',
      senderName: 'Kural Arasan',
      text: '100%. We developers often think caffeine can replace sleep. Let me know when you are free for tea this weekend.',
      time: new Date(Date.now() - 3600 * 1000 * 4),
    },
  ]
);

// Chat 3: Aarya & Janvi
await createChatWithMessages(
  USERS[0], // Aarya
  USERS[2], // Janvi
  [
    {
      senderId: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2',
      senderName: 'Janvi Patel',
      text: 'Hey Aarya! Did you try that 5-minute box breathing exercise I sent you?',
      time: new Date(Date.now() - 3600 * 1000 * 10),
    },
    {
      senderId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
      senderName: 'Aarya Balan',
      text: 'Yes! Tried it right before starting work today. It genuinely slowed down my heart rate.',
      time: new Date(Date.now() - 3600 * 1000 * 9),
    },
    {
      senderId: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2',
      senderName: 'Janvi Patel',
      text: 'Yay! I do it whenever anxious thoughts start spiraling. Works like magic 🌿',
      time: new Date(Date.now() - 3600 * 1000 * 8),
    },
  ]
);

console.log('   ✓ Created 3 real-time chat conversations with message history.');

// 7. Notifications for Aarya
console.log('\n7️⃣ Creating Notifications for Aarya...');
const NOTIFICATIONS = [
  {
    toUserId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
    fromUserId: '5hYHcsJGkEZpepMfrEg0t4GKHdP2',
    fromUserName: 'Priya Sharma',
    type: 'reaction',
    reactionType: 'hug',
    postId: 'post_aarya_mental_health',
    read: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 2),
  },
  {
    toUserId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
    fromUserId: 'M3uuHAZGfNdIKgHY9aj3zKeTatB2',
    fromUserName: 'Janvi Patel',
    type: 'comment',
    postId: 'post_aarya_mental_health',
    commentText: 'Needed to read this today. Sometimes we get caught in the hustle trap...',
    read: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 2),
  },
  {
    toUserId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
    fromUserId: 'fcMRF8jBaYMbUpEEwemcZTVx3C62',
    fromUserName: 'Chandran K',
    type: 'friend_request',
    read: false,
    createdAt: new Date(Date.now() - 3600 * 1000 * 1),
  },
  {
    toUserId: 'u8NHuSP15PP3lGq5VYloEKDnglf2',
    fromUserId: 'PyYwXkY1bnQZimLP6FLYg7W7vto1',
    fromUserName: 'Kural Arasan',
    type: 'perspective_change',
    read: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 12),
  },
];

for (let i = 0; i < NOTIFICATIONS.length; i++) {
  await setDoc(`notifications/notif_${i + 1}`, NOTIFICATIONS[i]);
}
console.log(`   ✓ Created ${NOTIFICATIONS.length} interactive notifications.`);

console.log('\n🎉 ALL MOCK DATA SEEDED SUCCESSFULLY!');

