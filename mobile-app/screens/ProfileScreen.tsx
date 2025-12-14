import * as ImagePicker from "expo-image-picker";
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '../constants/Colors';
import { supabase } from '../lib/supabaseClient';

async function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

export default function ProfileScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [isHostMode, setIsHostMode] = useState(false);

  // Phone edit modal
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phone, setPhone] = useState('');

  // Delete account modals (two steps)
  const [deleteStep1Visible, setDeleteStep1Visible] = useState(false);
  const [deleteStep2Visible, setDeleteStep2Visible] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Change password
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setIsHostMode(data.role === 'owner');
    } catch (error: any) {
      Alert.alert('Error loading profile', error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleHostMode = async (value: boolean) => {
    try {
      setIsHostMode(value);
      if (!profile) return;

      const newRole = value ? 'owner' : 'renter';
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, role: newRole });
    } catch (error: any) {
      Alert.alert('Error updating role', error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error: any) {
      Alert.alert('Error signing out', error.message);
    }
  };

  const handleAvatarUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo access to upload an avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      if (!file.uri) return;

      const ext = file.uri.split('.').pop();
      const filePath = `${profile.id}.${ext || 'jpg'}`;

      const blob = await uriToBlob(file.uri);
      const arrayBuffer = await blobToArrayBuffer(blob);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, arrayBuffer, {
          upsert: true,
          contentType: `image/${ext || 'jpeg'}`
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: avatarUrl });
      Alert.alert('Success', 'Your profile picture has been updated!');
    } catch (err: any) {
      Alert.alert('Error uploading photo', err.message);
    }
  };

  const handleSavePhone = async () => {
    try {
      if (!profile) return;
      const nextPhone = phone.trim();
      const phoneUpdate = nextPhone.length ? nextPhone : null;

      const { error } = await supabase
        .from('users')
        .update({ phone: phoneUpdate })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, phone: phoneUpdate });
      Alert.alert('Saved', 'Your phone number was updated.');
      setPhoneModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleChangePassword = async () => {
    try {
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match.');
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        Alert.alert('Weak password', 'Please use at least 6 characters.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      Alert.alert('Success', 'Password updated!');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const beginDelete = () => {
    setDeleteStep1Visible(true);
  };

  const proceedDeleteStep2 = () => {
    setDeleteStep1Visible(false);
    setConfirmEmail('');
    setDeleteStep2Visible(true);
  };

  const actuallyDeleteAccount = async () => {
    try {
      if (!profile) return;
      const currentEmail = (profile.email || '').trim();
      if (!confirmEmail || confirmEmail.trim().toLowerCase() !== currentEmail.toLowerCase()) {
        Alert.alert('Mismatch', 'Please type your current email exactly to confirm.');
        return;
      }

      setDeleting(true);

      const { error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: profile.id },
      });

      setDeleting(false);

      if (error) {
        Alert.alert('Delete failed', error.message || 'Could not delete your account.');
        return;
      }

      await supabase.auth.signOut();
      setDeleteStep2Visible(false);
      Alert.alert('Account deleted', 'Your account has been removed.');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err: any) {
      setDeleting(false);
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.deepBlue} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={{ color: Colors.gray700 }}>No profile data found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BACK BUTTON */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.email ? profile.email[0].toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={handleAvatarUpload}>
              <Ionicons name="camera" size={16} color={Colors.deepBlue} />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>
            {profile.email || (profile.role === 'owner' ? 'Owner' : 'Renter')}
          </Text>
          <Text style={styles.memberSince}>
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* ACCOUNT INFORMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={24} color={Colors.deepBlue} style={{ marginRight: Spacing.md }} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile.email || '—'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Ionicons name="phone-portrait-outline" size={24} color={Colors.deepBlue} style={{ marginRight: Spacing.md }} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{profile.phone || '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* PREFERENCES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.preferencesCard}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <Ionicons name="notifications-outline" size={24} color={Colors.deepBlue} style={{ marginRight: Spacing.md }} />
                <Text style={styles.preferenceText}>Push Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.gray300, true: Colors.deepBlue }}
                thumbColor={Colors.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <Ionicons name="radio-outline" size={24} color={Colors.deepBlue} style={{ marginRight: Spacing.md }} />
                <Text style={styles.preferenceText}>NFC Access</Text>
              </View>
              <Switch
                value={nfcEnabled}
                onValueChange={setNfcEnabled}
                trackColor={{ false: Colors.gray300, true: Colors.deepBlue }}
                thumbColor={Colors.white}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <Ionicons name="home-outline" size={24} color={Colors.deepBlue} style={{ marginRight: Spacing.md }} />
                <Text style={styles.preferenceText}>Host Profile</Text>
              </View>
              <Switch
                value={isHostMode}
                onValueChange={toggleHostMode}
                trackColor={{ false: Colors.gray300, true: Colors.deepBlue }}
                thumbColor={Colors.white}
              />
            </View>
          </View>
        </View>

        {/* ACTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setPhone(profile.phone || '');
              setPhoneModalVisible(true);
            }}
          >
            <Ionicons name="phone-portrait-outline" size={24} color={Colors.deepBlue} style={{ marginRight: Spacing.md }} />
            <Text style={styles.actionText}>Edit Phone Number</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setPasswordModalVisible(true)}
          >
            <Ionicons name="lock-closed-outline" size={24} color={Colors.deepBlue} style={{ marginRight: Spacing.md }} />
            <Text style={styles.actionText}>Change Password</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Support', 'Email support@keyaccess.app for assistance.')}
          >
            <Ionicons name="help-circle-outline" size={24} color={Colors.deepBlue} style={{ marginRight: Spacing.md }} />
            <Text style={styles.actionText}>Support</Text>
            <Text style={styles.actionChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* LOGOUT/DELETE */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={beginDelete}
          >
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* EDIT PHONE MODAL */}
      <Modal visible={phoneModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setPhone(profile.phone || '');
                  setPhoneModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSavePhone}>
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE WARNING MODAL */}
      <Modal visible={deleteStep1Visible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: Colors.error }]}>Delete Account</Text>
            <Text style={{ marginBottom: Spacing.md, color: Colors.gray800 }}>
              This will permanently remove your account, bookings, NFC keys, and all related
              data. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteStep1Visible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: Colors.error }]}
                onPress={proceedDeleteStep2}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal visible={deleteStep2Visible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: Colors.error }]}>Confirm Deletion</Text>
            <Text style={{ marginBottom: Spacing.sm, color: Colors.gray800 }}>
              Type your email <Text style={{ fontWeight: 'bold' }}>{profile.email}</Text> to
              confirm you want to permanently delete your account.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Type your email to confirm"
              value={confirmEmail}
              onChangeText={setConfirmEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteStep2Visible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: Colors.error }]}
                onPress={actuallyDeleteAccount}
                disabled={deleting}
              >
                <Text style={styles.modalButtonText}>
                  {deleting ? 'Deleting…' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={passwordModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              style={styles.input}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleChangePassword}>
                <Text style={styles.modalButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  backButtonText: {
    fontSize: FontSizes.base,
    color: Colors.deepBlue,
    fontWeight: FontWeights.semibold,
  },
  header: {
    backgroundColor: Colors.white,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarContainer: { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.deepBlue,
  },
  editAvatarIcon: { fontSize: FontSizes.sm },
  userName: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  memberSince: { fontSize: FontSizes.sm, color: Colors.gray600 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoIcon: { fontSize: FontSizes['2xl'], marginRight: Spacing.md },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: FontSizes.xs, color: Colors.gray600, marginBottom: 2 },
  infoValue: { fontSize: FontSizes.base, color: Colors.gray900 },
  divider: { height: 1, backgroundColor: Colors.gray200, marginVertical: Spacing.sm },
  preferencesCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  preferenceLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  preferenceIcon: { fontSize: FontSizes['2xl'], marginRight: Spacing.md },
  preferenceText: { fontSize: FontSizes.base, color: Colors.gray900 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  actionIcon: { fontSize: FontSizes['2xl'], marginRight: Spacing.md },
  actionText: { flex: 1, fontSize: FontSizes.base, color: Colors.gray900 },
  actionChevron: { fontSize: FontSizes['2xl'], color: Colors.gray400 },
  logoutButton: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.error,
  },
  deleteButton: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.error,
    marginTop: Spacing.sm,
  },
  deleteText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.bold,
    color: Colors.error,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: Colors.gray900,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancel: {
    backgroundColor: Colors.gray200,
    flex: 1,
    marginRight: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalSave: {
    backgroundColor: Colors.deepBlue,
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    color: Colors.white,
    fontWeight: FontWeights.semibold,
  },
});