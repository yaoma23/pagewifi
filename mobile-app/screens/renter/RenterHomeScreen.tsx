import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '../../constants/Colors';
import { supabase } from '../../lib/supabaseClient';

const SCAN_LEEWAY_HOURS = 2; // allow scanning this many hours before check-in

export default function RenterHomeScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentBookings, setCurrentBookings] = useState<any[]>([]);   // all active stays
  const [currentBooking, setCurrentBooking] = useState<any>(null);   // primary active stay (first one)
  const [upcomingBooking, setUpcomingBooking] = useState<any>(null); // next confirmed stay
  const [now, setNow] = useState<Date>(new Date());

  // Return keys modal state
  const [returnKeysStep1Visible, setReturnKeysStep1Visible] = useState(false);
  const [returnKeysStep2Visible, setReturnKeysStep2Visible] = useState(false);
  const [confirmReturn, setConfirmReturn] = useState("");
  const [returningKeys, setReturningKeys] = useState(false);
  const [selectedBookingForReturn, setSelectedBookingForReturn] = useState<any>(null);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // tick every 1s for a smooth countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser) {
        setLoading(false);
        return;
      }

      // Profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      if (profileError) throw profileError;
      setUser(userProfile);

      // Active bookings (now between check-in and check-out) - get ALL current bookings
      // Exclude 'completed' and 'cancelled' status - those should not show as current
      // Include bookings where check-in has passed (even if just now) and check-out hasn't passed
      const now = new Date();
      const nowISO = now.toISOString();
      const { data: activeBookings, error: activeErr } = await supabase
        .from('bookings')
        .select(
          `
          id, check_in, check_out, status,
          properties ( name, address )
        `
        )
        .eq('renter_id', authUser.id)
        .in('status', ['active', 'checked_in', 'confirmed']) // exclude 'completed' and 'cancelled'
        .lte('check_in', nowISO) // check-in has passed
        .gte('check_out', nowISO) // check-out hasn't passed yet
        .neq('status', 'completed') // explicitly exclude completed
        .neq('status', 'cancelled') // explicitly exclude cancelled
        .order('check_in', { ascending: true });

      if (activeErr && activeErr.code !== 'PGRST116') throw activeErr;
      const bookings = activeBookings || [];
      setCurrentBookings(bookings);
      setCurrentBooking(bookings.length > 0 ? bookings[0] : null); // Use first booking as primary

      // Next upcoming booking (after now, soonest first)
      // Only show bookings where check-in is still in the future
      // Exclude cancelled bookings
      const { data: upcoming, error: upErr } = await supabase
        .from('bookings')
        .select(
          `
          id, check_in, check_out, status,
          properties ( name, address )
        `
        )
        .eq('renter_id', authUser.id)
        .in('status', ['confirmed', 'scheduled', 'active', 'checked_in'])
        .neq('status', 'cancelled') // exclude cancelled bookings
        .gt('check_in', now.toISOString()) // Check-in is still in the future
        .order('check_in', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (upErr && upErr.code !== 'PGRST116') throw upErr;
      setUpcomingBooking(upcoming ?? null);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ---- Helpers ----
  const withinScanWindow = useMemo(() => {
    if (!currentBooking && !upcomingBooking) return false;

    // Active stay: allow scan
    if (currentBooking) return true;

    // Upcoming: allow pre-scan within SCAN_LEEWAY_HOURS
    if (upcomingBooking) {
      const checkIn = new Date(upcomingBooking.check_in).getTime();
      const diffMs = checkIn - now.getTime();
      const leewayMs = SCAN_LEEWAY_HOURS * 60 * 60 * 1000;
      return diffMs <= leewayMs && diffMs > 0;
    }
    return false;
  }, [currentBooking, upcomingBooking, now]);

  const scanTargetBookingId = currentBooking?.id ?? upcomingBooking?.id ?? null;

  const countdownText = useMemo(() => {
    if (!upcomingBooking) return '';
    const t = new Date(upcomingBooking.check_in).getTime() - now.getTime();
    if (t <= 0) return 'Starting now';
    const s = Math.floor(t / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
  }, [upcomingBooking, now]);

  const isCheckoutDay = useMemo(() => {
    if (!currentBooking) return false;
    const co = new Date(currentBooking.check_out);
    const n = now;
    return co.getFullYear() === n.getFullYear() &&
      co.getMonth() === n.getMonth() &&
      co.getDate() === n.getDate();
  }, [currentBooking, now]);

  const handleReturnKeys = async () => {
    if (confirmReturn !== "RETURN") {
      Alert.alert("Error", "Please type RETURN to confirm.");
      return;
    }

    if (!selectedBookingForReturn) {
      Alert.alert("Error", "No booking selected.");
      return;
    }

    setReturningKeys(true);
    try {
      // Update booking status to completed
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', selectedBookingForReturn.id);

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
              setSelectedBookingForReturn(null);
              // Reload data to refresh the booking list - completed bookings should disappear
              await loadData();
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.deepBlue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.userName}>{user?.full_name || 'Guest'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={styles.fallbackAvatar}>
                <Text style={styles.fallbackInitial}>
                  {user?.email ? user.email[0].toUpperCase() : '👤'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Current Booking (if check-in has started) OR Next Upcoming Booking */}
        {(currentBooking || upcomingBooking) ? (
          (() => {
            // Prioritize current booking over upcoming booking
            const displayBooking = currentBooking || upcomingBooking;
            const isCurrent = !!currentBooking;
            const checkInDate = new Date(displayBooking.check_in);
            const checkOutDate = new Date(displayBooking.check_out);
            const now = new Date();
            const checkInPassed = checkInDate <= now;
            
            return (
              <View style={styles.currentStayCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {isCurrent ? 'Your Current Stay' : 'Your Next Stay'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: Colors.deepBlue + '20' }]}>
                    <Text style={[styles.statusText, { color: Colors.deepBlue }]}>
                      {displayBooking.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.propertyInfo}>
                  <Text style={styles.propertyName}>
                    {(() => {
                      const propertyName = displayBooking.properties?.name;
                      const propertyAddress = displayBooking.properties?.address;

                      // Sonderborg mapping
                      if (user?.email === 'a@a.com' && (propertyAddress?.includes('Alsion') || propertyName?.includes('house'))) {
                        return 'Sonderborg';
                      }

                      // Copenhagen mapping
                      if (propertyName === 'Mountain Retreat') {
                        return 'Copenhagen';
                      }

                      return propertyName;
                    })()}
                  </Text>
                  <Text style={styles.propertyAddress}>
                    {(() => {
                      const propertyAddress = displayBooking.properties?.address;
                      const propertyName = displayBooking.properties?.name;

                      // Perlegade 2 mapping
                      if (user?.email === 'a@a.com' && (propertyAddress?.includes('Alsion') || propertyName?.includes('house'))) {
                        return 'Perlegade 2';
                      }

                      // Soborg mapping
                      if (propertyAddress === '456 pine road' || propertyAddress?.toLowerCase().includes('456 pine road')) {
                        return 'Soborg';
                      }

                      return propertyAddress;
                    })()}
                  </Text>
                </View>

                <View style={styles.dateInfo}>
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Check-in</Text>
                    <Text style={styles.dateValue}>
                      {new Date(displayBooking.check_in).toDateString()}
                    </Text>
                  </View>
                  <View style={styles.dateDivider} />
                  <View style={styles.dateItem}>
                    <Text style={styles.dateLabel}>Check-out</Text>
                    <Text style={styles.dateValue}>
                      {new Date(displayBooking.check_out).toDateString()}
                    </Text>
                  </View>
                </View>

                {!isCurrent && (
                  <View style={styles.countdownPill}>
                    <Text style={styles.countdownText}>Check-in in {countdownText}</Text>
                  </View>
                )}

                {/* Unlock NFC Button - Available when check-in has started */}
                {checkInPassed && (
                  <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={() => {
                      navigation.navigate('NFCAccess', { bookingId: displayBooking.id });
                    }}
                  >
                    <Ionicons name="lock-open-outline" size={20} color={Colors.white} style={{ marginRight: Spacing.sm }} />
                    <Text style={styles.unlockButtonText}>Unlock NFC</Text>
                  </TouchableOpacity>
                )}

                {/* Unlock NFC Button for upcoming bookings (before check-in) */}
                {!checkInPassed && (
                  <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={() => {
                      Alert.alert(
                        "Check-in Not Started",
                        `This booking starts on ${checkInDate.toLocaleDateString()}. NFC unlock will be available once check-in time arrives.`,
                        [{ text: "OK" }]
                      );
                    }}
                  >
                    <Ionicons name="lock-open-outline" size={20} color={Colors.white} style={{ marginRight: Spacing.sm }} />
                    <Text style={styles.unlockButtonText}>Unlock NFC</Text>
                  </TouchableOpacity>
                )}

                {/* Return Keys Button - Only show after check-in starts */}
                {checkInPassed && (
                  <TouchableOpacity
                    style={styles.returnKeysButton}
                    onPress={() => {
                      setSelectedBookingForReturn(displayBooking);
                      setReturnKeysStep1Visible(true);
                    }}
                  >
                    <Ionicons name="key-outline" size={20} color={Colors.error} style={{ marginRight: Spacing.sm }} />
                    <Text style={styles.returnKeysButtonText}>Return Keys & Check Out</Text>
                  </TouchableOpacity>
                )}

                {/* View Stay Details Button */}
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() => navigation.navigate('StayDetails', { bookingId: displayBooking.id })}
                >
                  <Text style={styles.viewDetailsText}>View Stay Details</Text>
                </TouchableOpacity>
              </View>
            );
          })()
        ) : null}

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => Alert.alert('Coming Soon', 'Reservation flow is under construction.')}
              activeOpacity={0.85}
            >
              <Ionicons name="search" size={32} color={Colors.deepBlue} style={{ marginBottom: Spacing.sm }} />
              <Text style={styles.quickActionText}>Book a Stay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Bookings')}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={32} color={Colors.deepBlue} style={{ marginBottom: Spacing.sm }} />
              <Text style={styles.quickActionText}>My bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('StayDetails', { bookingId: upcomingBooking?.id })}
              activeOpacity={0.85}
              disabled={!upcomingBooking}
            >
              <Ionicons name="book-outline" size={32} color={!upcomingBooking ? Colors.gray400 : Colors.deepBlue} style={{ marginBottom: Spacing.sm }} />
              <Text style={styles.quickActionText}>
                Property guide
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Help')}
              activeOpacity={0.85}
            >
              <Ionicons name="help-circle-outline" size={32} color={Colors.deepBlue} style={{ marginBottom: Spacing.sm }} />
              <Text style={styles.quickActionText}>Help & Support</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.85}
            >
              <Ionicons name="person-outline" size={32} color={Colors.deepBlue} style={{ marginBottom: Spacing.sm }} />
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Return Keys Warning Modal (Step 1) */}
      <Modal visible={returnKeysStep1Visible} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Ionicons name="warning-outline" size={48} color={Colors.error} style={{ alignSelf: 'center', marginBottom: Spacing.md }} />
            <Text style={[styles.modalTitle, { color: Colors.error }]}>Return Keys</Text>
            <Text style={styles.modalText}>
              This will mark your stay as completed and return the keys. Make sure you have:
            </Text>
            <View style={styles.checklist}>
              <Text style={styles.checklistItem}>• All keys returned to the key box</Text>
              <Text style={styles.checklistItem}>• Property is clean and ready</Text>
              <Text style={styles.checklistItem}>• All personal belongings removed</Text>
            </View>
            {selectedBookingForReturn && (
              <Text style={styles.modalText}>
                Property: {selectedBookingForReturn.properties?.name || 'Unknown'}
              </Text>
            )}
            <Text style={[styles.modalText, { fontWeight: FontWeights.bold, marginTop: Spacing.md }]}>
              This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setReturnKeysStep1Visible(false);
                  setSelectedBookingForReturn(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalContinue, { backgroundColor: Colors.error }]}
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
            <Text style={[styles.modalTitle, { color: Colors.error }]}>Confirm Return</Text>
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
                  { backgroundColor: Colors.error },
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
  container: { flex: 1, backgroundColor: Colors.gray50 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 100 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md,
  },
  greeting: { fontSize: FontSizes.sm, color: Colors.gray600 },
  userName: { fontSize: FontSizes['2xl'], fontWeight: FontWeights.bold, color: Colors.gray900 },

  notificationButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, overflow: 'hidden',
  },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  fallbackAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.deepBlue,
    justifyContent: 'center', alignItems: 'center',
  },
  fallbackInitial: { fontSize: FontSizes.lg, fontWeight: FontWeights.bold, color: Colors.white },

  currentStayCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.semibold, color: Colors.gray900 },
  statusBadge: { backgroundColor: Colors.emeraldLight, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.sm },
  statusText: { fontSize: FontSizes.xs, fontWeight: FontWeights.medium, color: Colors.emeraldGreen },

  propertyInfo: { marginBottom: Spacing.md },
  propertyName: { fontSize: FontSizes.xl, fontWeight: FontWeights.semibold, color: Colors.gray900, marginBottom: 4 },
  propertyAddress: { fontSize: FontSizes.sm, color: Colors.gray600 },

  dateInfo: {
    flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, paddingVertical: Spacing.md,
    backgroundColor: Colors.gray50, borderRadius: BorderRadius.md,
  },
  dateItem: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: FontSizes.xs, color: Colors.gray500, marginBottom: 4 },
  dateValue: { fontSize: FontSizes.sm, fontWeight: FontWeights.semibold, color: Colors.gray900 },
  dateDivider: { width: 1, height: 32, backgroundColor: Colors.gray300 },

  checkoutHint: {
    backgroundColor: Colors.warning, padding: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm,
  },
  checkoutHintText: { fontSize: FontSizes.xs, color: Colors.gray800 },

  unlockButton: {
    backgroundColor: Colors.emeraldGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.emeraldGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  unlockButtonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },

  viewDetailsButton: { paddingVertical: Spacing.sm, alignItems: 'center', marginTop: Spacing.sm },
  viewDetailsText: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, color: Colors.deepBlue },
  returnKeysButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.error,
    backgroundColor: Colors.white,
    marginBottom: Spacing.sm,
  },
  returnKeysButtonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.error,
  },

  countdownPill: {
    alignSelf: 'flex-start', backgroundColor: Colors.gray100, paddingHorizontal: Spacing.sm,
    paddingVertical: 4, borderRadius: 999,
  },
  countdownText: { fontSize: FontSizes.xs, color: Colors.gray700 },

  quickActionsSection: { marginTop: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: FontWeights.semibold, color: Colors.gray900, marginBottom: Spacing.md },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  quickActionCard: {
    width: '47%', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center',
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  // quickActionIcon removed
  quickActionText: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium, color: Colors.gray700, textAlign: 'center' },

  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: Colors.gray900,
  },
  modalText: {
    fontSize: FontSizes.base,
    color: Colors.gray700,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  checklist: {
    marginVertical: Spacing.md,
    paddingLeft: Spacing.md,
  },
  checklistItem: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    backgroundColor: Colors.gray50,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  modalCancel: {
    backgroundColor: Colors.gray200,
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.gray700,
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
    color: Colors.white,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.base,
  },
});
