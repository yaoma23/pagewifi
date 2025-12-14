import { useFocusEffect } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from "../../constants/Colors";
import { useAuth } from "../../lib/authContext";
import { supabase } from "../../lib/supabaseClient";

type Property = { id: string; name: string; address?: string; city?: string };
type Booking = {
  id: string;
  property_id: string;
  status: string;
  check_in: string;
  check_out: string;
};

const ACTIVE_STATUSES = ["active", "checked_in"];
const UPCOMING_STATUSES = ["confirmed", "scheduled"];

export default function OwnerHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    occupiedCount: 0,
    upcomingCount: 0,
    nextCheckIn: null as string | null,
  });

  const loadOwnerData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: propertyRows, error: propertyError } = await supabase
        .from("properties")
        .select("id, name, address, city")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (propertyError) throw propertyError;
      const mappedProperties = propertyRows || [];
      setProperties(mappedProperties);

      if (mappedProperties.length > 0) {
        const propertyIds = mappedProperties.map((p) => p.id);
        const { data: bookingRows, error: bookingsError } = await supabase
          .from("bookings")
          .select("id, property_id, status, check_in, check_out")
          .in("property_id", propertyIds);
        if (bookingsError) throw bookingsError;
        const normalizedBookings = bookingRows || [];
        setBookings(normalizedBookings);

        const occupiedCount = normalizedBookings.filter((b) =>
          ACTIVE_STATUSES.includes(b.status)
        ).length;
        const upcoming = normalizedBookings.filter((b) =>
          UPCOMING_STATUSES.includes(b.status)
        );
        const upcomingCount = upcoming.length;
        const nextCheckIn =
          upcoming
            .map((b) => b.check_in)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || null;

        setStats({
          totalProperties: mappedProperties.length,
          occupiedCount,
          upcomingCount,
          nextCheckIn,
        });
      } else {
        setBookings([]);
        setStats({
          totalProperties: 0,
          occupiedCount: 0,
          upcomingCount: 0,
          nextCheckIn: null,
        });
      }
    } catch (err) {
      console.error("Error loading owner dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadOwnerData();
    }, [user?.id])
  );

  const bookingsByProperty = useMemo(() => {
    const map: Record<string, { active?: Booking | null; upcoming?: Booking | null }> = {};
    bookings.forEach((booking) => {
      if (!map[booking.property_id]) {
        map[booking.property_id] = { active: null, upcoming: null };
      }
      if (ACTIVE_STATUSES.includes(booking.status)) {
        map[booking.property_id].active = booking;
      } else if (UPCOMING_STATUSES.includes(booking.status)) {
        const existingUpcoming = map[booking.property_id].upcoming;
        if (
          !existingUpcoming ||
          new Date(booking.check_in) < new Date(existingUpcoming.check_in)
        ) {
          map[booking.property_id].upcoming = booking;
        }
      }
    });
    return map;
  }, [bookings]);

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Total properties</Text>
        <Text style={styles.statValue}>{stats.totalProperties}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Occupied today</Text>
        <Text style={styles.statValue}>{stats.occupiedCount}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Upcoming check-ins</Text>
        <Text style={styles.statValue}>{stats.upcomingCount}</Text>
        {stats.nextCheckIn && (
          <Text style={styles.statSubtext}>
            Next: {new Date(stats.nextCheckIn).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  const quickActions = [
    {
      icon: "🔑",
      label: "Manage keys",
      onPress: () => navigation.navigate("OwnerDashboard", { screen: "ManageKeys" }),
    },
    {
      icon: "📅",
      label: "Booking summary",
      onPress: () =>
        Alert.alert(
          "Booking Summary",
          "This feature will show a consolidated view of all bookings."
        ),
    },
  ];

  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.quickGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.quickCard}
            onPress={action.onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.quickIcon}>{action.icon}</Text>
            <Text style={styles.quickLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPropertyCard = ({ item }: { item: Property }) => {
    const bookingState = bookingsByProperty[item.id] || {};
    let statusLabel = "Available";
    let statusColor = Colors.gray300;
    let bookingInfo: string | null = null;

    if (bookingState.active) {
      statusLabel = "Guest in house";
      statusColor = Colors.emeraldGreen;
      bookingInfo = `Checkout ${new Date(
        bookingState.active.check_out
      ).toLocaleDateString()}`;
    } else if (bookingState.upcoming) {
      statusLabel = "Upcoming stay";
      statusColor = Colors.warning;
      bookingInfo = `Check-in ${new Date(
        bookingState.upcoming.check_in
      ).toLocaleDateString()}`;
    }

    return (
      <View style={styles.propertyCard}>
        <View style={styles.propertyHeader}>
          <View style={styles.propertyTitleWrap}>
            <Text style={styles.propertyName}>{item.name}</Text>
            <Text style={styles.propertyAddress}>
              {item.address || item.city || "No address saved"}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusColor }]}>
            <Text style={styles.statusPillText}>{statusLabel}</Text>
          </View>
        </View>
        {bookingInfo && <Text style={styles.bookingInfoText}>{bookingInfo}</Text>}
        <View style={styles.propertyActions}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() =>
              navigation.navigate("PropertyDetails", { propertyId: item.id })
            }
          >
            <Text style={styles.primaryActionText}>View details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() =>
              navigation.navigate("OwnerDashboard", {
                screen: "Keys",
              })
            }
          >
            <Text style={styles.secondaryActionText}>Keys</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.pageTitle}>Owner dashboard</Text>
      <Text style={styles.subtitle}>
        Track performance across your listings and stay ready for the next guest.
      </Text>
      {renderStats()}
      {renderQuickActions()}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My properties</Text>
        <TouchableOpacity onPress={() => navigation.navigate("AddProperty")}>
          <Text style={styles.sectionLink}>+ Add property</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.deepBlue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          properties.length === 0 ? styles.emptyListContent : styles.listContent
        }
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No properties yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first property to start accepting bookings.
            </Text>
            <TouchableOpacity
              style={[styles.primaryAction, styles.fullWidthPrimary]}
              onPress={() => navigation.navigate("AddProperty")}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionText}>Add property</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={renderPropertyCard}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.gray50,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  listHeader: {
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: FontSizes["2xl"],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  subtitle: {
    color: Colors.gray600,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: 6,
  },
  statValue: {
    fontSize: FontSizes["2xl"],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  statSubtext: {
    marginTop: 2,
    color: Colors.gray500,
    fontSize: FontSizes.xs,
  },
  quickActionsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray800,
    marginBottom: Spacing.sm,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  quickCard: {
    width: "47%",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  quickIcon: { fontSize: 28, marginBottom: Spacing.xs },
  quickImage: { width: 32, height: 32, marginBottom: Spacing.xs },
  quickLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
    textAlign: "center",
  },
  sectionHeader: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLink: {
    color: Colors.deepBlue,
    fontWeight: FontWeights.semibold,
  },
  propertyCard: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  propertyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  propertyTitleWrap: { flex: 1, paddingRight: Spacing.md },
  propertyName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  propertyAddress: { color: Colors.gray600, marginTop: 2 },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  bookingInfoText: {
    marginTop: Spacing.sm,
    color: Colors.gray700,
    fontSize: FontSizes.sm,
  },
  propertyActions: {
    flexDirection: "row",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: Colors.deepBlue,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  primaryActionText: {
    color: Colors.white,
    fontWeight: FontWeights.semibold,
  },
  secondaryAction: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.gray300,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  secondaryActionText: {
    color: Colors.gray800,
    fontWeight: FontWeights.semibold,
  },
  emptyState: {
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    color: Colors.gray600,
    textAlign: "center",
    marginBottom: Spacing.md,
  },

  fullWidthPrimary: {
    alignSelf: "stretch",
    marginTop: Spacing.sm,
  },
});
