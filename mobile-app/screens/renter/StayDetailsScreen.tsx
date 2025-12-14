import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors as AppColors, BorderRadius, FontSizes, FontWeights, Spacing } from '../../constants/Colors';
import { supabase } from '../../lib/supabaseClient';

export default function StayDetailsScreen({ navigation, route }: any) {
  const { bookingId } = route.params || {};
  const [activeTab, setActiveTab] = useState<'details' | 'contact'>('details');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);

  // Return keys modal state
  const [returnKeysStep1Visible, setReturnKeysStep1Visible] = useState(false);
  const [returnKeysStep2Visible, setReturnKeysStep2Visible] = useState(false);
  const [confirmReturn, setConfirmReturn] = useState("");
  const [returningKeys, setReturningKeys] = useState(false);

  // Reload booking data when screen comes into focus (in case status changed)
  useFocusEffect(
    useCallback(() => {
      if (bookingId) {
        loadBookingData();
      }
    }, [bookingId])
  );

  const loadBookingData = async () => {
    try {
      setLoading(true);

      // Load booking with property info
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          properties (*)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) throw bookingError;

      setBooking(bookingData);
      setProperty(bookingData?.properties);

      // Load owner info separately
      if (bookingData?.properties?.owner_id) {
        const { data: ownerData, error: ownerError } = await supabase
          .from('users')
          .select('id, full_name, email, phone')
          .eq('id', bookingData.properties.owner_id)
          .single();

        if (!ownerError && ownerData) {
          setOwner(ownerData);
        }
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.deepBlue} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking || !property) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }





  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleReturnKeys = async () => {
    if (confirmReturn !== "RETURN") {
      Alert.alert("Error", "Please type RETURN to confirm.");
      return;
    }

    setReturningKeys(true);
    try {
      // Update booking status to completed
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId);

      if (error) throw error;

      Alert.alert(
        "Keys Returned",
        "Your keys have been returned and your stay is now complete.",
        [
          {
            text: "OK",
            onPress: async () => {
              setReturnKeysStep2Visible(false);
              setConfirmReturn("");
              // Reload booking data before going back to ensure UI is updated
              await loadBookingData();
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error returning keys:', error);
      Alert.alert("Error", error.message || "Failed to return keys. Please try again.");
    } finally {
      setReturningKeys(false);
    }
  };

  const renderTabContent = () => {
    const houseRules = property?.house_rules || [];
    switch (activeTab) {
      case 'details':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Property Information</Text>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>
                  {property.address === "454 pine road" || property.address?.toLowerCase().includes("454 pine road")
                    ? "Perlegade 2"
                    : property.address === "456 pine road" || property.address?.toLowerCase().includes("456 pine road")
                      ? "Soborg"
                      : property.address}
                </Text>
              </View >
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Check-in Date</Text>
                <Text style={styles.infoValue}>{formatDate(booking.check_in)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Check-out Date</Text>
                <Text style={styles.infoValue}>{formatDate(booking.check_out)}</Text>
              </View>
            </View >

            {houseRules.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>House Rules</Text>
                {houseRules.map((rule: string, index: number) => (
                  <View key={index} style={styles.ruleItem}>
                    <Text style={styles.ruleIcon}>•</Text>
                    <Text style={styles.ruleText}>{rule}</Text>
                  </View>
                ))}
              </View>
            )}
          </View >
        );



      case 'contact':
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Host Information</Text>
              {owner ? (
                <>
                  <View style={styles.hostCard}>
                    <View style={styles.hostAvatar}>
                      <Text style={styles.hostAvatarText}>
                        {owner.full_name
                          ? owner.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                          : owner.email?.[0]?.toUpperCase() || '👤'}
                      </Text>
                    </View>
                    <Text style={styles.hostName}>{owner.full_name || owner.email || 'Host'}</Text>
                  </View>

                  {owner.phone && (
                    <TouchableOpacity style={styles.contactButton}>
                      <Text style={styles.contactIcon}>📞</Text>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={styles.contactValue}>{owner.phone}</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {owner.email && (
                    <TouchableOpacity style={styles.contactButton}>
                      <Text style={styles.contactIcon}>✉️</Text>
                      <View style={styles.contactInfo}>
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text style={styles.contactValue}>{owner.email}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>Host information not available.</Text>
              )}

              <View style={styles.emergencySection}>
                <Text style={styles.emergencyTitle}>Emergency Contacts</Text>
                <View style={styles.emergencyItem}>
                  <Text style={styles.emergencyLabel}>Local Police:</Text>
                  <Text style={styles.emergencyValue}>911</Text>
                </View>
                <View style={styles.emergencyItem}>
                  <Text style={styles.emergencyLabel}>Property Management:</Text>
                  <Text style={styles.emergencyValue}>+1 (555) 999-0000</Text>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {property.name === "Mountain Retreat" ? "Copenhagen" : property.name}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.tabActive]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
            Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'contact' && styles.tabActive]}
          onPress={() => setActiveTab('contact')}
        >
          <Text style={[styles.tabText, activeTab === 'contact' && styles.tabTextActive]}>
            Contact
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>

      {/* Only show buttons for current bookings (not future ones) */}
      {booking && new Date(booking.check_in) <= new Date() && new Date(booking.check_out) >= new Date() && (
        <View style={styles.footer}>
          {/* Unlock NFC Button (Green, on top) */}
          <TouchableOpacity
            style={styles.unlockButton}
            onPress={() => navigation.navigate('NFCAccess', { bookingId: bookingId })}
          >
            <Ionicons name="lock-open-outline" size={20} color={AppColors.white} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.unlockButtonText}>Unlock NFC</Text>
          </TouchableOpacity>

          {/* Return Keys Button (Below) */}
          <TouchableOpacity
            style={styles.returnKeysButton}
            onPress={() => setReturnKeysStep1Visible(true)}
          >
            <Ionicons name="key-outline" size={20} color={AppColors.error} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.returnKeysButtonText}>Return Keys & Check Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Return Keys Warning Modal (Step 1) */}
      <Modal visible={returnKeysStep1Visible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="warning-outline" size={48} color={AppColors.error} style={{ alignSelf: 'center', marginBottom: Spacing.md }} />
            <Text style={[styles.modalTitle, { color: AppColors.error }]}>Return Keys</Text>
            <Text style={styles.modalText}>
              This will mark your stay as completed and return the keys. Make sure you have:
            </Text>
            <View style={styles.checklist}>
              <Text style={styles.checklistItem}>• All keys returned to the key box</Text>
              <Text style={styles.checklistItem}>• Property is clean and ready</Text>
              <Text style={styles.checklistItem}>• All personal belongings removed</Text>
            </View>
            <Text style={[styles.modalText, { fontWeight: FontWeights.bold, marginTop: Spacing.md }]}>
              This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setReturnKeysStep1Visible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalContinue, { backgroundColor: AppColors.error }]}
                onPress={() => {
                  setReturnKeysStep1Visible(false);
                  setReturnKeysStep2Visible(true);
                }}
              >
                <Text style={styles.modalButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Return Keys Confirmation Modal (Step 2) */}
      <Modal visible={returnKeysStep2Visible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: AppColors.error }]}>Confirm Return</Text>
            <Text style={styles.modalText}>
              Type <Text style={{ fontWeight: FontWeights.bold }}>RETURN</Text> to confirm you want to return the keys and check out.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type RETURN to confirm"
              value={confirmReturn}
              onChangeText={setConfirmReturn}
              autoCapitalize="characters"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setReturnKeysStep2Visible(false);
                  setConfirmReturn("");
                }}
                disabled={returningKeys}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalContinue,
                  { backgroundColor: AppColors.error },
                  (confirmReturn !== "RETURN" || returningKeys) && styles.modalContinueDisabled
                ]}
                onPress={handleReturnKeys}
                disabled={confirmReturn !== "RETURN" || returningKeys}
              >
                <Text style={styles.modalButtonText}>
                  {returningKeys ? "Returning..." : "Return Keys"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.gray50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: AppColors.white,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.gray200,
  },
  backButton: {
    paddingVertical: Spacing.sm,
  },
  backButtonText: {
    fontSize: FontSizes.base,
    color: AppColors.deepBlue,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: AppColors.gray900,
  },
  placeholder: {
    width: 50,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: AppColors.white,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.gray200,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: AppColors.deepBlue,
  },
  tabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: AppColors.gray600,
  },
  tabTextActive: {
    color: AppColors.deepBlue,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FontSizes.base,
    color: AppColors.error,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: AppColors.gray500,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  tabContent: {
    flex: 1,
  },
  section: {
    backgroundColor: AppColors.white,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: AppColors.gray900,
    marginBottom: Spacing.md,
  },
  infoItem: {
    marginBottom: Spacing.md,
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    color: AppColors.gray600,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: FontSizes.base,
    color: AppColors.gray900,
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  ruleIcon: {
    fontSize: FontSizes.base,
    color: AppColors.deepBlue,
    marginRight: Spacing.sm,
    width: 20,
  },
  ruleText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: AppColors.gray700,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  amenityCard: {
    width: '47%',
    backgroundColor: AppColors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  amenityIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  amenityName: {
    fontSize: FontSizes.sm,
    color: AppColors.gray700,
    textAlign: 'center',
  },
  hostCard: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  hostAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  hostAvatarText: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.semibold,
    color: AppColors.white,
  },
  hostName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: AppColors.gray900,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.gray50,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  contactIcon: {
    fontSize: FontSizes['2xl'],
    marginRight: Spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: FontSizes.xs,
    color: AppColors.gray600,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: FontSizes.base,
    color: AppColors.gray900,
  },
  emergencySection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: AppColors.gray50,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.error,
  },
  emergencyTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: AppColors.error,
    marginBottom: Spacing.sm,
  },
  emergencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  emergencyLabel: {
    fontSize: FontSizes.sm,
    color: AppColors.gray700,
  },
  emergencyValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: AppColors.gray900,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: AppColors.white,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: AppColors.gray200,
    shadowColor: AppColors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  unlockButton: {
    backgroundColor: AppColors.emeraldGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    shadowColor: AppColors.emeraldGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  unlockButtonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: AppColors.white,
  },
  returnKeysButton: {
    backgroundColor: AppColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: AppColors.error,
  },
  returnKeysButtonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: AppColors.error,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: AppColors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: AppColors.gray900,
  },
  modalText: {
    fontSize: FontSizes.base,
    color: AppColors.gray700,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  checklist: {
    marginVertical: Spacing.md,
    paddingLeft: Spacing.md,
  },
  checklistItem: {
    fontSize: FontSizes.sm,
    color: AppColors.gray700,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: AppColors.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: FontSizes.base,
    color: AppColors.gray900,
    backgroundColor: AppColors.gray50,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  modalCancel: {
    backgroundColor: AppColors.gray200,
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    color: AppColors.gray700,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.base,
  },
  modalContinue: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalContinueDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: AppColors.white,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.base,
  },
});
