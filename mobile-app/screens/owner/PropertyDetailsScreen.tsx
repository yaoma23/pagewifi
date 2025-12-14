import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from "../../constants/Colors";
import { supabase } from "../../lib/supabaseClient";


export default function PropertyDetailsScreen({ route, navigation }: any) {
  const { propertyId } = route.params;
  const [property, setProperty] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [keyReturns, setKeyReturns] = useState<any[]>([]);
  const [nfcKeys, setNfcKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [houseRules, setHouseRules] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");
  const [customAmenityIcon, setCustomAmenityIcon] = useState("🏠");

  // Add reservation modal state
  const [reservationModalVisible, setReservationModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [reference, setReference] = useState("");
  const [creatingReservation, setCreatingReservation] = useState(false);

  // --- load property and related data ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: prop }, { data: books }, { data: returns }, { data: keys }] = await Promise.all([
        supabase.from("properties").select("*").eq("id", propertyId).single(),
        supabase.from("bookings").select("*, renter:users(email), renter_id").eq("property_id", propertyId),
        supabase.from("key_returns").select("*").eq("property_id", propertyId),
        supabase.from("nfc_keys").select("*").eq("property_id", propertyId),
      ]);
      setProperty(prop);
      setBookings(books || []);
      setKeyReturns(returns || []);
      setNfcKeys(keys || []);
      setName(prop?.name ?? "");
      setAddress(prop?.address ?? "");
      setCity(prop?.city ?? "");
      setCountry(prop?.country ?? "");

    } catch (err) {
      console.error("Error loading property:", err);
      Alert.alert("Error", "Could not load property details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [propertyId]);


  // --- save edits ---
  const handleSave = async () => {
    try {
      // Format amenities as JSON array

      const { error } = await supabase
        .from("properties")
        .update({
          name,
          address,
          city,
          country,
        })
        .eq("id", propertyId);
      if (error) throw error;
      setEditing(false);
      await loadData();
      Alert.alert("Saved", "Property details updated!");
    } catch (err: any) {
      Alert.alert("Update failed", err.message);
    }
  };

  // --- delete property ---
  const handleDelete = async () => {
    Alert.alert("Confirm delete", "This will remove the property permanently.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase.from("properties").delete().eq("id", propertyId);
            if (error) throw error;
            Alert.alert("Deleted", "Property removed successfully.");
            navigation.goBack();
          } catch (err: any) {
            Alert.alert("Delete failed", err.message);
          }
        },
      },
    ]);
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("OwnerDashboard");
    }
  };


  const toggleAmenity = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities((prev) => prev.filter((item) => item !== amenity));
    } else {
      setSelectedAmenities((prev) => [...prev, amenity]);
    }
  };

  // Create reservation
  const handleCreateReservation = async () => {
    if (!firstName.trim() || !lastName.trim() || !reference.trim()) {
      Alert.alert("Error", "Please fill in all fields (First Name, Last Name, and Reference).");
      return;
    }

    setCreatingReservation(true);
    try {
      const checkIn = new Date();
      const checkOut = new Date(checkIn.getTime() + 5 * 60 * 1000); // 5 minutes from now

      // Try to insert with reference field first
      const bookingData: any = {
        property_id: propertyId,
        check_in: checkIn.toISOString(),
        check_out: checkOut.toISOString(),
        status: "confirmed",
      };

      // Add reference if the column exists (it's the unique identifier)
      bookingData.reference = reference.trim();

      const { data: newBooking, error } = await supabase
        .from("bookings")
        .insert([bookingData])
        .select()
        .single();

      if (error) {
        // If reference column doesn't exist, try without it but log a warning
        console.warn("Reference field may not exist, trying without it:", error);
        const { data: bookingWithoutRef, error: err2 } = await supabase
          .from("bookings")
          .insert([
            {
              property_id: propertyId,
              check_in: checkIn.toISOString(),
              check_out: checkOut.toISOString(),
              status: "confirmed",
            },
          ])
          .select()
          .single();

        if (err2) throw err2;
        Alert.alert("Success", `Reservation created for ${firstName} ${lastName}. Reference: ${reference} (Note: Reference may not be stored in database)`);
      } else {
        Alert.alert("Success", `Reservation created for ${firstName} ${lastName}.\nReference: ${reference}\nCheck-in: ${checkIn.toLocaleString()}\nCheck-out: ${checkOut.toLocaleString()}`);
      }

      // Clear form
      setFirstName("");
      setLastName("");
      setReference("");
      setReservationModalVisible(false);

      // Reload data
      await loadData();
    } catch (err: any) {
      console.error("Error creating reservation:", err);
      Alert.alert("Error", err.message || "Failed to create reservation.");
    } finally {
      setCreatingReservation(false);
    }
  };

  const renderSelectedAmenities = () =>
    selectedAmenities.length > 0 && (
      <View style={styles.selectedAmenities}>
        <View style={styles.selectedHeaderRow}>
          <Text style={styles.selectedLabel}>Selected amenities</Text>
          <Text style={styles.selectedHint}>Tap × to remove</Text>
        </View>
        <View style={styles.selectedChips}>
          {selectedAmenities.map((amenity, idx) => (
            <View key={`${amenity}-${idx}`} style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>{amenity}</Text>
              <TouchableOpacity
                style={styles.selectedChipRemove}
                onPress={() => toggleAmenity(amenity)}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  if (!property)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Property not found.</Text>
      </View>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.gray50 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        {editing ? (
          <>
            <Text style={styles.label}>Property Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Property name" />

            <Text style={styles.label}>Address *</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Address" />

            <Text style={styles.label}>City *</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" />

            <Text style={styles.label}>Country *</Text>
            <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="Country" />


            <View style={styles.row}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>
              {property.name === "Mountain Retreat" ? "Copenhagen" : property.name}
            </Text>
            <Text style={styles.address}>
              {property.address === "454 pine road" || property.address?.toLowerCase().includes("454 pine road")
                ? "Perlegade 2"
                : property.address === "456 pine road" || property.address?.toLowerCase().includes("456 pine road")
                  ? "Soborg"
                  : property.address}
            </Text>

            <Text style={styles.address}>{property.city}, {property.country}</Text>

            <View style={styles.row}>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Text style={styles.btnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.btnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.section}>Bookings</Text>
          <TouchableOpacity
            style={styles.addReservationButton}
            onPress={() => setReservationModalVisible(true)}
          >
            <Text style={styles.addReservationButtonText}>+ Add Reservation</Text>
          </TouchableOpacity>
        </View>
        {bookings.length === 0 ? (
          <Text style={styles.empty}>No bookings yet.</Text>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => (
              <View style={styles.booking}>
                <Text style={styles.bookingText}>
                  Renter: {item.renter?.email ?? item.renter_id}
                </Text>
                <Text style={styles.bookingText}>
                  From: {item.check_in ? new Date(item.check_in).toLocaleDateString() : item.start_date}
                </Text>
                <Text style={styles.bookingText}>
                  To: {item.check_out ? new Date(item.check_out).toLocaleDateString() : item.end_date}
                </Text>
                {item.reference && (
                  <Text style={styles.bookingText}>Reference: {item.reference}</Text>
                )}
              </View>
            )}
          />
        )}

        <Text style={styles.section}>Key Returns</Text>
        {keyReturns.length === 0 ? (
          <Text style={styles.empty}>No key returns yet.</Text>
        ) : (
          <FlatList
            data={keyReturns}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text>Return Date: {item.return_date}</Text>
                <Text>Condition: {item.condition}</Text>
              </View>
            )}
          />
        )}

        <Text style={styles.section}>NFC Keys</Text>
        {nfcKeys.length === 0 ? (
          <Text style={styles.empty}>No NFC keys assigned.</Text>
        ) : (
          <FlatList
            data={nfcKeys}
            keyExtractor={(k) => k.id}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <Text>Key ID: {item.key_uid}</Text>
                <Text>Status: {item.status}</Text>
              </View>
            )}
          />
        )}
      </ScrollView>

      {/* Add Reservation Modal */}
      <Modal visible={reservationModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Reservation</Text>
            <Text style={styles.modalSubtitle}>
              Create a new booking for this property
            </Text>

            <Text style={styles.modalLabel}>First Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter first name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />

            <Text style={styles.modalLabel}>Last Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <Text style={styles.modalLabel}>Reference *</Text>
            <Text style={styles.modalHint}>
              Unique booking reference/ID
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter booking reference"
              value={reference}
              onChangeText={setReference}
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setReservationModalVisible(false);
                  setFirstName("");
                  setLastName("");
                  setReference("");
                }}
                disabled={creatingReservation}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, creatingReservation && styles.modalSaveDisabled]}
                onPress={handleCreateReservation}
                disabled={creatingReservation}
              >
                <Text style={styles.modalButtonText}>
                  {creatingReservation ? "Creating..." : "Create"}
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
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: Spacing.sm,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  backIcon: {
    fontSize: FontSizes.lg,
    color: Colors.deepBlue,
    marginRight: 4,
  },
  backText: {
    fontSize: FontSizes.sm,
    color: Colors.deepBlue,
    fontWeight: FontWeights.semibold,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: FontSizes["2xl"], fontWeight: FontWeights.bold, color: Colors.gray900, marginBottom: Spacing.xs },
  address: { color: Colors.gray700, marginBottom: Spacing.md },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  section: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.semibold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
    color: Colors.gray900,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  addReservationButton: {
    backgroundColor: Colors.deepBlue,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  addReservationButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  infoSection: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: FontSizes.base,
    color: Colors.gray700,
    lineHeight: 22,
  },
  empty: { color: Colors.gray600, marginBottom: Spacing.sm },
  booking: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: Spacing.sm,
  },
  bookingText: { color: Colors.gray800 },
  itemCard: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: Spacing.sm,
  },
  error: { color: Colors.error },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray300,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  amenityChipSelected: {
    backgroundColor: Colors.deepBlue + '20',
    borderColor: Colors.deepBlue,
  },
  amenityIcon: {
    fontSize: FontSizes.base,
    marginRight: Spacing.xs,
  },
  amenityText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  amenityTextSelected: {
    color: Colors.deepBlue,
    fontWeight: FontWeights.semibold,
  },
  customAmenityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconInput: {
    width: 60,
    textAlign: 'center',
  },
  customInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: Colors.deepBlue,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.sm,
  },
  selectedAmenities: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  selectedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
  },
  selectedHint: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.gray50,
  },
  selectedChipText: {
    fontSize: FontSizes.sm,
    color: Colors.gray800,
    marginRight: Spacing.xs,
  },
  selectedChipRemove: {
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: Colors.error,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  amenitiesDisplayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  amenityDisplayCard: {
    width: '47%',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  amenityDisplayIcon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  amenityDisplayName: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    textAlign: 'center',
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  ruleIcon: {
    fontSize: FontSizes.base,
    color: Colors.deepBlue,
    marginRight: Spacing.sm,
    width: 20,
  },
  ruleText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  row: { flexDirection: "row", gap: 10, marginBottom: Spacing.md, marginTop: Spacing.sm },
  editBtn: { backgroundColor: Colors.deepBlue, padding: Spacing.md, borderRadius: BorderRadius.md, flex: 1, alignItems: 'center' },
  deleteBtn: { backgroundColor: Colors.error, padding: Spacing.md, borderRadius: BorderRadius.md, flex: 1, alignItems: 'center' },
  saveBtn: { backgroundColor: Colors.deepBlue, padding: Spacing.md, borderRadius: BorderRadius.md, flex: 1, alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.gray500, padding: Spacing.md, borderRadius: BorderRadius.md, flex: 1, alignItems: 'center' },
  btnText: { color: Colors.white, fontWeight: FontWeights.semibold },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.lg,
  },
  modalLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  modalHint: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginBottom: Spacing.xs,
  },
  modalInput: {
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  modalCancel: {
    backgroundColor: Colors.gray200,
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  modalSave: {
    backgroundColor: Colors.deepBlue,
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  modalSaveDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: Colors.white,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.base,
  },
});
