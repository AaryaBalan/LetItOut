import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../context/AlertContext';

function Report({ item }) {
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const review = async status => {
    if (!resolution.trim()) return showAlert('Review note required', 'Explain the outcome for the moderation record.');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'reports', item.id), { status, resolution: resolution.trim(), reviewedAt: serverTimestamp() });
    } catch (error) { showAlert('Review failed', error.message); }
    finally { setSaving(false); }
  };
  const removePost = () => {
    if (!resolution.trim()) return showAlert('Review note required', 'Explain why this post should be removed.');
    showAlert('Remove reported post?', 'This removes the post from the community feed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', onPress: async () => {
        setSaving(true);
        try {
          const batch = writeBatch(db);
          batch.delete(doc(db, 'posts', item.postId));
          batch.update(doc(db, 'reports', item.id), { status: 'resolved', resolution: resolution.trim(), reviewedAt: serverTimestamp() });
          await batch.commit();
        } catch (error) { showAlert('Removal failed', error.message); }
        finally { setSaving(false); }
      } }
    ]);
  };
  return <View style={{ padding: 16, marginBottom: 16, backgroundColor: theme.card, borderRadius: 12 }}>
    <Text style={{ color: theme.text, fontWeight: 'bold' }}>{item.reason} · {item.status}</Text>
    <Text style={{ color: theme.textSecondary }}>{item.resolution || 'Awaiting review'}</Text>
    <Button title="View reported post" onPress={() => router.push(`/post/${item.postId}`)} />
    <TextInput accessibilityLabel="Moderation resolution" value={resolution} onChangeText={setResolution} maxLength={1000} multiline placeholder="Explain your decision" placeholderTextColor={theme.textSecondary} style={{ color: theme.text, padding: 12, borderWidth: 1, borderColor: theme.border }} />
    <Button title="Mark reviewing" disabled={saving} onPress={() => review('reviewing')} />
    <Button title="Resolve report" disabled={saving} onPress={() => review('resolved')} />
    <Button title="Remove post and resolve" disabled={saving} onPress={removePost} />
    <Button title="Dismiss report" disabled={saving} onPress={() => review('dismissed')} />
  </View>;
}
export default function Moderation() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [reports, setReports] = useState([]);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    let stopped = false;
    let unsubscribe = () => {};
    (async () => {
      try {
        const token = await auth.currentUser?.getIdTokenResult();
        if (stopped) return;
        if (!token?.claims.moderator) { setStatus('denied'); return; }
        unsubscribe = onSnapshot(collection(db, 'reports'), snapshot => {
          setReports(snapshot.docs.map(d => ({ ...d.data(), id: d.id })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
          setStatus('ready');
        }, () => setStatus('error'));
      } catch { if (!stopped) setStatus('error'); }
    })();
    return () => { stopped = true; unsubscribe(); };
  }, [user?.uid]);
  return <SafeAreaView style={{ flex: 1, padding: 20, backgroundColor: theme.background }}>
    <Text style={{ fontSize: 24, color: theme.text, marginBottom: 20 }}>Moderation</Text>
    {status === 'loading' ? <ActivityIndicator /> : status !== 'ready' ? <Text style={{ color: theme.text }}>Moderator access is required, or reports could not be loaded.</Text> :
      <FlatList data={reports} keyExtractor={item => item.id} renderItem={({item}) => <Report item={item} />} ListEmptyComponent={<Text style={{color:theme.text}}>No reports to review.</Text>} />}
  </SafeAreaView>;
}
