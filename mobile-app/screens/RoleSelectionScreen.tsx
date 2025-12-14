import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '../constants/Colors';
import { useUser } from '../context/UserContext';
import { useAuth } from '../lib/authContext';

export default function RoleSelectionScreen({ navigation, route }: any) {
  const [selectedRole, setSelectedRole] = useState<'owner' | 'renter' | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUserRole } = useUser();
  const { signup } = useAuth();
  
  // Get email and password from navigation params (passed from SignUpScreen)
  const { email, password } = route.params || {};

  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert('Please select a role', 'Choose whether you are an owner or renter.');
      return;
    }

    setLoading(true);
    try {
      const { supabase } = await import('../lib/supabaseClient');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        // If no user is logged in but we have email/password, try to sign up
        if (email && password) {
          const newUser = await signup(email, password, selectedRole);
          if (!newUser) {
            throw new Error('Signup failed - no user returned');
          }
          setUserRole(selectedRole);
          
          if (selectedRole === 'renter') {
            navigation.reset({ index: 0, routes: [{ name: 'RenterHome' }] });
          } else {
            navigation.reset({ index: 0, routes: [{ name: 'OwnerDashboard' }] });
          }
          return;
        } else {
          throw userError || new Error('No user found. Please sign up first.');
        }
      }

      // User is already logged in, just update the role
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // ✅ Update context
      setUserRole(selectedRole);

      // ✅ Navigate to the right home screen
      if (selectedRole === 'renter') {
        navigation.reset({ index: 0, routes: [{ name: 'RenterHome' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'OwnerDashboard' }] });
      }
    } catch (err: any) {
      console.error('Role selection error:', err);
      Alert.alert('Error selecting role', err.message || 'Could not update role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a role</Text>

        <View style={styles.rolesContainer}>
          {/* OWNER */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'owner' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('owner')}
          >
            <View style={styles.roleIconContainer}>
              <Text style={styles.roleIcon}>🏢</Text>
            </View>
            <Text style={styles.roleTitle}>Property Owner</Text>
            <Text style={styles.roleDescription}>
              Manage properties and grant access to guests
            </Text>
            {selectedRole === 'owner' && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* RENTER */}
          <TouchableOpacity
            style={[
              styles.roleCard,
              selectedRole === 'renter' && styles.roleCardSelected,
            ]}
            onPress={() => setSelectedRole('renter')}
          >
            <View style={styles.roleIconContainer}>
              <Text style={styles.roleIcon}>🗝️</Text>
            </View>
            <Text style={styles.roleTitle}>Guest / Renter</Text>
            <Text style={styles.roleDescription}>
              Access rental properties with NFC key boxes
            </Text>
            {selectedRole === 'renter' && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* CONTINUE BUTTON */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!selectedRole || loading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!selectedRole || loading}
        >
          <Text style={styles.continueButtonText}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
    backgroundColor: Colors.gray50,
  },
  title: {
    fontSize: FontSizes["2xl"],
    fontWeight: FontWeights.bold,
    textAlign: "center",
    marginBottom: Spacing.xl,
    color: Colors.gray900,
  },
  rolesContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  roleCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.gray200,
    alignItems: "center",
    position: "relative",
  },
  roleCardSelected: {
    borderColor: Colors.deepBlue,
    backgroundColor: Colors.deepBlue + '10',
  },
  roleIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  roleIcon: {
    fontSize: 40,
  },
  roleTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  roleDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.deepBlue,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  continueButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.deepBlue,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  continueButtonDisabled: {
    backgroundColor: Colors.gray400,
    opacity: 0.6,
  },
  continueButtonText: {
    color: Colors.white,
    fontWeight: FontWeights.semibold,
    fontSize: FontSizes.base,
  },
});
