import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from "../../constants/Colors";
import { useAuth } from "../../lib/authContext";
import { supabase } from "../../lib/supabaseClient";

import { Database } from "../../types";

type KeyWithDetails = Pick<Database['public']['Tables']['nfc_keys']['Row'], 'id' | 'key_code' | 'status' | 'issued_at' | 'expires_at' | 'booking_id'> & {
  bookings: Pick<Database['public']['Tables']['bookings']['Row'], 'id' | 'property_id' | 'check_in' | 'check_out'> & {
    renter: Pick<Database['public']['Tables']['users']['Row'], 'full_name' | 'email'> | null;
    properties: Pick<Database['public']['Tables']['properties']['Row'], 'id' | 'name' | 'owner_id'>;
  }
};

export default function KeysScreen() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<KeyWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [properties, setProperties] = useState<Pick<Database['public']['Tables']['properties']['Row'], 'id' | 'name'>[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [renterEmail, setRenterEmail] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("15:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("11:00");
  const [generating, setGenerating] = useState(false);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("nfc_keys")
        .select(`
          id,
          booking_id,
          key_code,
          status,
          issued_at,
          expires_at,
          bookings!inner (
            id,
            property_id,
            check_in,
            check_out,
            renter:users!renter_id (
              full_name,
              email
            ),
            properties!inner (
              id,
              name,
              owner_id
            )
          )
        `)
        .eq("bookings.properties.owner_id", user?.id)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      // Cast the result to the expected type as Supabase's type inference for complex joins can be tricky
      setKeys((data as unknown) as KeyWithDetails[] || []);
    } catch (err) {
      console.error("Error loading keys:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("owner_id", user?.id);
      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error("Error loading properties:", err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadKeys();
      loadProperties();
    }
  }, [user]);

  const handleRevoke = async (keyId: string) => {
    Alert.alert(
      "Confirm Revoke",
      "Are you sure you want to revoke this key? The renter will lose access immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              // First, get the booking_id from the key
              const { data: keyData, error: keyError } = await supabase
                .from("nfc_keys")
                .select("booking_id")
                .eq("id", keyId)
                .single();
              
              if (keyError) {
                console.error("Error fetching key:", keyError);
                throw keyError;
              }

              // Revoke by setting expires_at to past date instead of changing status
              // This avoids the status constraint violation
              const { error: keyUpdateError } = await supabase
                .from("nfc_keys")
                .update({ expires_at: new Date().toISOString() })
                .eq("id", keyId);
              
              if (keyUpdateError) {
                console.error("Error revoking key:", keyUpdateError);
                throw keyUpdateError;
              }

              // Also update the booking status to 'cancelled' if booking_id exists
              if (keyData?.booking_id) {
                const { error: bookingUpdateError } = await supabase
                  .from("bookings")
                  .update({ status: 'cancelled' })
                  .eq("id", keyData.booking_id);
                
                if (bookingUpdateError) {
                  console.error("Error updating booking status:", bookingUpdateError);
                  // Don't throw - key was revoked successfully, booking update is secondary
                }
              }
              
              Alert.alert("Success", "Key access has been revoked successfully.");
              // Reload keys to reflect the change
              await loadKeys();
            } catch (err: any) {
              console.error("Revoke key error:", err);
              Alert.alert(
                "Error",
                err.message || "Failed to revoke key access. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleGrantKey = async () => {
    if (!selectedProperty || !renterEmail || !startDate || !endDate) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setGenerating(true);
    try {
      // 1. Find renter by email
      const normalizedEmail = renterEmail.trim().toLowerCase();
      const { data: renterData, error: renterError } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .single();

      if (renterError || !renterData) {
        throw new Error("Renter not found with this email.");
      }

      // Helper to parse DD/MM/YYYY to ISO
      const parseDateToISO = (dateStr: string, timeStr: string) => {
        const parts = dateStr.split('/');
        if (parts.length !== 3) {
          throw new Error("Invalid date format. Use DD/MM/YYYY");
        }

        let [day, month, year] = parts;

        // Ensure padding
        day = day.padStart(2, '0');
        month = month.padStart(2, '0');

        if (year.length !== 4) {
          throw new Error("Year must be 4 digits");
        }

        // Basic validation
        const m = parseInt(month, 10);
        const d = parseInt(day, 10);
        if (m < 1 || m > 12) throw new Error("Month must be 01-12");
        if (d < 1 || d > 31) throw new Error("Day must be 01-31");

        // Construct ISO string for Date constructor: YYYY-MM-DDTHH:MM:00
        // Note: This creates a date in local time (device time) which is usually what we want for input
        const date = new Date(`${year}-${month}-${day}T${timeStr}:00`);

        if (isNaN(date.getTime())) {
          throw new Error("Invalid date value");
        }

        return date.toISOString();
      };

      // 2. Create a new booking
      const checkInISO = parseDateToISO(startDate, startTime);
      const checkOutISO = parseDateToISO(endDate, endTime);

      if (new Date(checkOutISO) <= new Date(checkInISO)) {
        throw new Error("Check-out must be after check-in");
      }

      const { data: newBooking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          property_id: selectedProperty,
          renter_id: renterData.id,
          check_in: checkInISO,
          check_out: checkOutISO,
          status: "confirmed",
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // 3. Create the key
      const newKey: Database['public']['Tables']['nfc_keys']['Insert'] = {
        booking_id: newBooking.id,
        key_code: Math.floor(1000 + Math.random() * 9000).toString(),
        status: "active",
        issued_at: new Date().toISOString(),
        expires_at: checkOutISO,
      };

      const { error: insertError } = await supabase.from("nfc_keys").insert(newKey);
      if (insertError) throw insertError;

      Alert.alert("Success", "Access granted and key generated!");
      setModalVisible(false);
      resetForm();
      loadKeys();
    } catch (err: any) {
      Alert.alert("Failed", err.message);
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setSelectedProperty(null);
    setRenterEmail("");
    setStartDate("");
    setEndDate("");
  };

  const formatInputDate = (text: string) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/[^0-9]/g, '');

    // Auto-insert slashes
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 4) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
  };

  const handleDateChange = (text: string, setter: (val: string) => void) => {
    const formatted = formatInputDate(text);
    setter(formatted);
  };

  const renderKeyItem = ({ item }: { item: KeyWithDetails }) => {
    // Check if key is expired (revoked) by comparing expires_at to current time
    const isExpired = item.expires_at ? new Date(item.expires_at) < new Date() : false;
    const isRevoked = isExpired;
    const renterName = item.bookings?.renter?.full_name || item.bookings?.renter?.email || "Unknown Renter";
    const propertyName = item.bookings?.properties?.name || "Unknown Property";
    const dates = `${new Date(item.bookings?.check_in).toLocaleDateString()} - ${new Date(item.bookings?.check_out).toLocaleDateString()}`;

    return (
      <View style={[styles.card, isRevoked && styles.cardRevoked]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.propertyName}>{propertyName}</Text>
            <Text style={styles.renterName}>{renterName}</Text>
          </View>
          <View style={[styles.statusBadge, isRevoked ? styles.statusRevoked : styles.statusActive]}>
            <Text style={[styles.statusText, isRevoked ? styles.statusTextRevoked : styles.statusTextActive]}>
              {isRevoked ? "REVOKED" : item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.dateText}>{dates}</Text>
        </View>

        {!isRevoked && (
          <TouchableOpacity style={styles.revokeButton} onPress={() => handleRevoke(item.id)}>
            <Text style={styles.revokeButtonText}>Revoke Access</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.deepBlue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Keys</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {keys.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No keys assigned yet.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyBtnText}>Grant a Key</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={keys}
          keyExtractor={(k) => k.id}
          renderItem={renderKeyItem}
          refreshing={loading}
          onRefresh={loadKeys}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* Grant Key Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Grant Access</Text>
            <Text style={styles.modalSubtitle}>Create a booking and issue a key.</Text>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Property</Text>
              <FlatList
                data={properties}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(p) => p.id}
                style={{ maxHeight: 50, marginBottom: Spacing.md }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.propertyChip,
                      selectedProperty === item.id && styles.propertyChipSelected,
                    ]}
                    onPress={() => setSelectedProperty(item.id)}
                  >
                    <Text style={[
                      styles.propertyChipText,
                      selectedProperty === item.id && styles.propertyChipTextSelected
                    ]}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />

              <Text style={styles.label}>Renter Email</Text>
              <TextInput
                style={styles.input}
                placeholder="renter@example.com"
                value={renterEmail}
                onChangeText={setRenterEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Check-in Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    value={startDate}
                    onChangeText={(text) => handleDateChange(text, setStartDate)}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Check-out Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/YYYY"
                    value={endDate}
                    onChangeText={(text) => handleDateChange(text, setEndDate)}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.label}>Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="HH:MM"
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setModalVisible(false); resetForm(); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!selectedProperty || !renterEmail) && styles.disabledBtn]}
                onPress={handleGrantKey}
                disabled={!selectedProperty || !renterEmail || generating}
              >
                {generating ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalConfirmText}>Grant Access</Text>
                )}
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
    padding: Spacing.lg,
    backgroundColor: Colors.gray50,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes["2xl"],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  addButton: {
    backgroundColor: Colors.deepBlue,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: Colors.emeraldGreen,
  },
  cardRevoked: {
    borderLeftColor: Colors.gray400,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  propertyName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
  },
  renterName: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: Colors.emeraldLight,
  },
  statusRevoked: {
    backgroundColor: Colors.gray200,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  statusTextActive: {
    color: Colors.emeraldGreen,
  },
  statusTextRevoked: {
    color: Colors.gray600,
  },
  cardBody: {
    marginBottom: Spacing.md,
  },
  dateText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    marginBottom: 4,
  },
  revokeButton: {
    backgroundColor: Colors.error + "10",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  revokeButtonText: {
    color: Colors.error,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.sm,
  },
  empty: {
    textAlign: "center",
    color: Colors.gray600,
    marginBottom: Spacing.md,
  },
  emptyBtn: {
    backgroundColor: Colors.deepBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emptyBtnText: {
    color: Colors.white,
    fontWeight: FontWeights.semibold,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
    color: Colors.gray900,
  },
  modalSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  propertyOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    width: "100%",
  },
  propertyOptionSelected: {
    backgroundColor: Colors.deepBlue + "10",
  },
  propertyOptionText: {
    fontSize: FontSizes.md,
    color: Colors.gray800,
  },
  propertyOptionTextSelected: {
    color: Colors.deepBlue,
    fontWeight: FontWeights.semibold,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
    width: "100%",
  },
  modalCancel: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray200,
    alignItems: "center",
  },
  modalCancelText: {
    color: Colors.gray800,
    fontWeight: FontWeights.semibold,
  },
  modalConfirm: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.deepBlue,
    alignItems: "center",
  },
  disabledBtn: {
    opacity: 0.5,
  },
  modalConfirmText: {
    color: Colors.white,
    fontWeight: FontWeights.semibold,
  },
  formContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  propertyChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray300,
    marginRight: Spacing.sm,
    backgroundColor: Colors.white,
  },
  propertyChipSelected: {
    backgroundColor: Colors.deepBlue + '20',
    borderColor: Colors.deepBlue,
  },
  propertyChipText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  propertyChipTextSelected: {
    color: Colors.deepBlue,
    fontWeight: FontWeights.semibold,
  },
});
