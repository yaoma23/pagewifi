import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from "../../constants/Colors";
import { useAuth } from "../../lib/authContext";
import { supabase } from "../../lib/supabaseClient";


export default function AddPropertyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");


  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("OwnerDashboard");
    }
  };


  const handleAdd = async () => {
    if (!name || !address || !city || !country) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }

    try {
      const { error } = await supabase.from("properties").insert([
        {
          name,
          address,
          city,
          country,
          owner_id: user?.id,
        },
      ]);
      if (error) throw error;

      Alert.alert("Property added", "Your new property was added successfully!");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error adding property", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Add Property</Text>

        <Text style={styles.label}>Property Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Sunset Villa"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="Full address"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., New York"
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.label}>Country *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., USA"
          value={country}
          onChangeText={setCountry}
        />


        <TouchableOpacity style={styles.button} onPress={handleAdd}>
          <Text style={styles.buttonText}>Save Property</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray50 },
  scrollView: { flex: 1 },
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
  title: {
    fontSize: FontSizes["2xl"],
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.lg,
    color: Colors.gray900,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: Colors.deepBlue + "20",
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconInput: {
    width: 60,
    textAlign: "center",
    marginBottom: 0,
  },
  customInput: {
    flex: 1,
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: Colors.deepBlue,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
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
  selectedLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  selectedHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    justifyContent: "center",
    alignItems: "center",
  },
  removeText: {
    color: Colors.error,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  button: {
    backgroundColor: Colors.deepBlue,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: FontWeights.bold,
    fontSize: FontSizes.base,
  },
});
