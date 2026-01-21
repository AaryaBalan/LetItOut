import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categories } from '../../data/dummyData';

export default function CreatePost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Information', 'Please fill in both title and description.');
      return;
    }
    Alert.alert('Post Shared!', 'Your feelings have been shared with the community. You are not alone. 💜', [
      { text: 'View Feed', onPress: () => router.push('/(tabs)/home') },
      { text: 'OK', style: 'cancel' }
    ]);
    setTitle('');
    setDescription('');
    setCategory(categories[0]);
    setIsAnonymous(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Share Your Feelings</Text>
          <Text style={styles.subtitle}>You're in a safe, judgment-free space</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Give your post a title..."
              placeholderTextColor="#9ca3af"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
              >
                {categories.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share what's on your mind..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={8}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity onPress={() => setIsAnonymous(!isAnonymous)} style={styles.toggleContainer}>
            <View style={[styles.toggle, isAnonymous && styles.toggleActive]}>
              <View style={[styles.toggleCircle, isAnonymous && styles.toggleCircleActive]} />
            </View>
            <Text style={styles.toggleLabel}>Post anonymously</Text>
            <Text style={styles.toggleStatus}>{isAnonymous ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSubmit} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Share Your Feelings</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  keyboardView: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  logo: { fontSize: 24, fontWeight: 'bold', color: '#9575cd', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  subtitle: { color: '#6b7280', fontSize: 14 },
  scrollView: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  fieldContainer: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  input: { backgroundColor: '#ffffff', borderRadius: 8, padding: 16, color: '#374151', borderWidth: 1, borderColor: '#e5e7eb', fontSize: 16 },
  pickerContainer: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  picker: { height: 50 },
  textArea: { minHeight: 140, textAlignVertical: 'top' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f3e8ff', borderRadius: 8, marginBottom: 24 },
  toggle: { width: 48, height: 24, borderRadius: 12, backgroundColor: '#d1d5db', marginRight: 12 },
  toggleActive: { backgroundColor: '#9575cd' },
  toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff', marginTop: 2, marginLeft: 2 },
  toggleCircleActive: { marginLeft: 26 },
  toggleLabel: { color: '#374151', fontWeight: '500', flex: 1 },
  toggleStatus: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  submitButton: { backgroundColor: '#9575cd', paddingVertical: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  submitButtonText: { color: '#ffffff', fontWeight: 'bold', textAlign: 'center', fontSize: 18 },
});
