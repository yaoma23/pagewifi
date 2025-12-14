import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '../../constants/Colors';
import { supabase } from '../../lib/supabaseClient';

export default function BookingsScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
  const [pastBookings, setPastBookings] = useState<any[]>([]);

  const loadBookings = React.useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return;

    const mapRow = (row: any) => {
      const propertyName = row.properties?.name ?? 'Property';
      const propertyAddress = row.properties?.address ?? '';

      // Map property names and addresses
      const displayName = propertyName === "Mountain Retreat" ? "Copenhagen" : propertyName;
      let displayAddress = propertyAddress;

      if (propertyAddress === "454 pine road" || propertyAddress?.toLowerCase().includes("454 pine road")) {
        displayAddress = "Perlegade 2";
      } else if (propertyAddress === "456 pine road" || propertyAddress?.toLowerCase().includes("456 pine road")) {
        displayAddress = "Soborg";
      }

      return {
        id: row.id,
        property: displayName,
        address: displayAddress,
        checkIn: new Date(row.check_in).toDateString(),
        checkOut: new Date(row.check_out).toDateString(),
        status: row.status,   // 'confirmed' | 'completed'
        image: 'home',        // icon name
      };
    };

    // upcoming (check-in hasn't happened yet - shows until check-in time arrives)
    // Exclude cancelled bookings
    const { data: upcoming, error: upErr } = await supabase
      .from('bookings')
      .select(`
        id,
        check_in,
        check_out,
        status,
        properties (name, address)
      `)
      .eq('renter_id', user.id)
      .in('status', ['confirmed', 'active', 'checked_in', 'scheduled'])
      .neq('status', 'cancelled') // exclude cancelled bookings
      .gt('check_in', new Date().toISOString()) // Only bookings where check-in hasn't happened yet
      .order('check_in', { ascending: true });

    if (!upErr && upcoming) setUpcomingBookings(upcoming.map(mapRow));

    // past (check-out has passed OR status is completed)
    const now = new Date().toISOString();
    const { data: past, error: pastErr } = await supabase
      .from('bookings')
      .select(`
        id,
        check_in,
        check_out,
        status,
        properties (name, address)
      `)
      .eq('renter_id', user.id)
      .or(`status.eq.completed,check_out.lt.${now}`) // Completed OR check-out time has passed
      .order('check_out', { ascending: false });

    if (!pastErr && past) setPastBookings(past.map(mapRow));
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const renderBookingCard = (booking: any, isPast: boolean = false) => (
    <TouchableOpacity key={booking.id} style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.propertyImage}>
          <Ionicons name={booking.image} size={32} color={Colors.deepBlue} />
        </View>
        <View style={styles.bookingInfo}>
          <Text style={styles.propertyName}>{booking.property}</Text>
          <Text style={styles.propertyAddress}>{booking.address}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          booking.status === 'completed' && styles.statusBadgeCompleted
        ]}>
          <Text style={[
            styles.statusText,
            booking.status === 'completed' && styles.statusTextCompleted
          ]}>
            {booking.status === 'confirmed' ? 'Confirmed' : 'Completed'}
          </Text>
        </View>
      </View>

      <View style={styles.dateContainer}>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Check-in</Text>
          <Text style={styles.dateValue}>{booking.checkIn}</Text>
        </View>
        <View style={styles.dateDivider} />
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Check-out</Text>
          <Text style={styles.dateValue}>{booking.checkOut}</Text>
        </View>
      </View>

      {booking.status === 'confirmed' && !isPast && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButtonSmall}
            onPress={() => navigation.navigate('StayDetails', { bookingId: booking.id })}
          >
            <Text style={styles.actionButtonSmallText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSmallOutline}>
            <Text style={styles.actionButtonSmallOutlineText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'confirmed' && isPast && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButtonSmall}
            onPress={() => navigation.navigate('StayDetails', { bookingId: booking.id })}
          >
            <Text style={styles.actionButtonSmallText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'completed' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={async () => {
              Alert.alert(
                "Restore Booking",
                "This will restore the booking and change its status back to confirmed. Continue?",
                [
                  {
                    text: "Cancel",
                    style: "cancel"
                  },
                  {
                    text: "Restore",
                    onPress: async () => {
                      try {
                        const { error } = await supabase
                          .from('bookings')
                          .update({ status: 'confirmed' })
                          .eq('id', booking.id);

                        if (error) throw error;

                        Alert.alert("Success", "Booking has been restored.");
                        loadBookings(); // Refresh the list
                      } catch (error: any) {
                        Alert.alert("Error", error.message || "Failed to restore booking.");
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.restoreButtonText}>Restore Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reviewButton}>
            <Text style={styles.reviewButtonText}>Leave a Review</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'upcoming' && (
          <>
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map(booking => renderBookingCard(booking, false))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color={Colors.gray300} style={{ marginBottom: Spacing.lg }} />
                <Text style={styles.emptyTitle}>No Upcoming Bookings</Text>
                <Text style={styles.emptyText}>
                  You don't have any upcoming reservations
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'past' && (
          <>
            {pastBookings.length > 0 ? (
              pastBookings.map(booking => renderBookingCard(booking, true))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color={Colors.gray300} style={{ marginBottom: Spacing.lg }} />
                <Text style={styles.emptyTitle}>No Past Bookings</Text>
                <Text style={styles.emptyText}>
                  Your booking history will appear here
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  headerTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.deepBlue,
  },
  tabText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.medium,
    color: Colors.gray600,
  },
  tabTextActive: {
    color: Colors.deepBlue,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
  },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  propertyImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  propertyEmoji: {
    fontSize: 32,
  },
  // propertyEmoji removed
  bookingInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  statusBadge: {
    backgroundColor: Colors.emeraldLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeCompleted: {
    backgroundColor: Colors.gray200,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    color: Colors.emeraldGreen,
  },
  statusTextCompleted: {
    color: Colors.gray600,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: FontSizes.xs,
    color: Colors.gray600,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  dateDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.gray300,
    marginHorizontal: Spacing.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButtonSmall: {
    flex: 1,
    backgroundColor: Colors.deepBlue,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  actionButtonSmallText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  actionButtonSmallOutline: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  actionButtonSmallOutlineText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  restoreButton: {
    flex: 1,
    backgroundColor: Colors.deepBlue,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  reviewButton: {
    flex: 1,
    backgroundColor: Colors.emeraldGreen,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  reviewButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  // emptyIcon removed
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSizes.base,
    color: Colors.gray600,
    textAlign: 'center',
  },
});
