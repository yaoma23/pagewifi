import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Theme } from '../constants/theme';
import { supabase } from '../lib/supabaseClient';

export default function SignupScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !fullName) {
      Toast.show({
        type: 'error',
        text1: 'Missing information',
        text2: 'Please fill all required fields.',
      });
      return;
    }

    try {
      setLoading(true);

      // Check if email already exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        Toast.show({
          type: 'error',
          text1: 'Email already registered',
          text2: 'This email is already in use. Please sign in instead.',
        });
        setLoading(false);
        return;
      }

      // 1️⃣ Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        // Provide user-friendly error messages
        let errorMessage = error.message;
        if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
          errorMessage = 'This email is already registered. Please sign in instead.';
        } else if (error.message?.includes('invalid email')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (error.message?.includes('password')) {
          errorMessage = 'Password must be at least 6 characters long.';
        }
        throw new Error(errorMessage);
      }

      const user = data?.user;
      if (!user) {
        throw new Error('User creation failed. Please try again.');
      }

      // 2️⃣ Insert row into `users` table (linked to auth.users.id) WITHOUT role
      // Role will be set in RoleSelectionScreen
      const { error: insertError } = await supabase.from('users').insert([
        {
          id: user.id, // matches auth.users.id
          full_name: fullName,
          phone: phone || null,
          email: email,
          avatar_url: null,
          role: null, // Role will be selected in RoleSelectionScreen
        },
      ]);

      if (insertError) {
        // If insert fails due to duplicate, user might have been created in auth but not in users table
        if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          throw new Error('This email is already registered. Please sign in instead.');
        }
        throw insertError;
      }

      // 3️⃣ Check if database applied a default role and reset it to null if needed
      const { data: userData, error: checkError2 } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!checkError2 && userData && userData.role) {
        // Database applied a default role, reset it to null
        await supabase
          .from('users')
          .update({ role: null })
          .eq('id', user.id);
      }

      // Navigate to RoleSelection - user is already logged in, just needs to select role
      navigation.reset({
        index: 0,
        routes: [{ name: 'RoleSelection' }],
      });
    } catch (err: any) {
      console.error('Signup error:', err);
      Toast.show({
        type: 'error',
        text1: 'Sign up failed',
        text2: err.message || 'An error occurred. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={Theme.colors.textSecondary}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              placeholderTextColor={Theme.colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={Theme.colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={Theme.colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signupButton, loading && { opacity: 0.7 }]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          {/* Already have account */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.l,
    paddingTop: 80,
    paddingBottom: Theme.spacing.xl,
  },
  header: {
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: Theme.fonts.sizes.xxl,
    fontWeight: Theme.fonts.bold.fontWeight,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.s,
  },
  subtitle: {
    fontSize: Theme.fonts.sizes.m,
    color: Theme.colors.textSecondary,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: Theme.spacing.l,
  },
  label: {
    fontSize: Theme.fonts.sizes.s,
    fontWeight: Theme.fonts.medium.fontWeight,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.s,
  },
  input: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: Theme.spacing.m,
    paddingVertical: Theme.spacing.m,
    fontSize: Theme.fonts.sizes.m,
    color: Theme.colors.text,
  },
  signupButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.m,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Theme.spacing.l,
  },
  signupButtonText: {
    fontSize: Theme.fonts.sizes.m,
    fontWeight: Theme.fonts.medium.fontWeight,
    color: Theme.colors.white,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Theme.spacing.l,
  },
  loginText: {
    fontSize: Theme.fonts.sizes.s,
    color: Theme.colors.textSecondary,
  },
  loginLink: {
    fontSize: Theme.fonts.sizes.s,
    fontWeight: Theme.fonts.medium.fontWeight,
    color: Theme.colors.primary,
  },
});
