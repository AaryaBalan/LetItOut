import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

// Combine legacy public ownership with private ownership records for anonymous posts.
export function subscribeOwnedPosts(uid, onPosts, onError) {
  let stopped = false;
  let version = 0;
  let publicPosts = [];
  let ownedPosts = [];
  const publish = () => {
    if (stopped) return;
    const all = new Map([...ownedPosts, ...publicPosts].map(post => [post.id, post]));
    onPosts([...all.values()].sort((a, b) => {
      const time = value => value?.toMillis?.() ?? new Date(value || 0).getTime();
      return time(b.createdAt) - time(a.createdAt);
    }));
  };
  const legacy = onSnapshot(query(collection(db, 'posts'), where('authorId', '==', uid)), snapshot => {
    publicPosts = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
    publish();
  }, onError);
  const privatePosts = onSnapshot(collection(db, 'users', uid, 'ownedPosts'), async snapshot => {
    const request = ++version;
    try {
      const docs = await Promise.all(snapshot.docs.map(d => getDoc(doc(db, 'posts', d.id))));
      if (stopped || request !== version) return;
      ownedPosts = docs.filter(d => d.exists()).map(d => ({ ...d.data(), id: d.id }));
      publish();
    } catch (error) { if (!stopped) onError(error); }
  }, onError);
  return () => { stopped = true; legacy(); privatePosts(); };
}
