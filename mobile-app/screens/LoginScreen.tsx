import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUserRole } = useUser();

  // ✅ Auto-redirect if user already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error checking session:', error.message);
        return;
      }

      const session = data.session;
      if (session?.user) {
        await redirectAfterLogin(session.user.id);
      }
    };

    checkSession();
  }, []);

  // ✅ Login handler
  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing fields',
        text2: 'Please enter both email and password.',
      });
      return;
    }

    try {
      setLoading(true);

      // Authenticate
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error('Login failed – no user found.');

      await redirectAfterLogin(user.id);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Login failed',
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Redirect helper
  const redirectAfterLogin = async (userId: string) => {
    try {
      // Fetch role
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const role = data?.role || null;
      setUserRole(role);

      const nextRoute =
        role === 'renter'
          ? 'RenterHome'
          : role === 'owner'
            ? 'OwnerDashboard'
            : 'RoleSelection';

      navigation.reset({ index: 0, routes: [{ name: nextRoute }] });
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Error loading profile',
        text2: err.message,
      });
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
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
              autoComplete="email"
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
              autoComplete="password"
            />
          </View>

          {/* Forgot password (optional link) */}
          <TouchableOpacity>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Theme.colors.white} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social login placeholders */}
          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Toast.show({ type: 'info', text1: 'Coming soon', text2: 'Google login not yet implemented' })}
            >
              <Text style={styles.socialButtonIcon}>G</Text>
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => Toast.show({ type: 'info', text1: 'Coming soon', text2: 'Apple login not yet implemented' })}
            >
              <Ionicons name="logo-apple" size={20} color={Theme.colors.text} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Signup link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.l,
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xxl,
  },
  header: { marginBottom: Theme.spacing.xxl, alignItems: 'center' },
  title: {
    fontSize: Theme.fonts.sizes.xxl,
    fontWeight: Theme.fonts.bold.fontWeight,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Theme.fonts.sizes.m,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  form: { width: '100%' },
  inputGroup: { marginBottom: Theme.spacing.l },
  label: {
    fontSize: Theme.fonts.sizes.s,
    fontWeight: Theme.fonts.medium.fontWeight,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    marginLeft: Theme.spacing.xs,
  },
  input: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: Theme.spacing.l,
    paddingVertical: Theme.spacing.m,
    fontSize: Theme.fonts.sizes.m,
    color: Theme.colors.text,
  },
  forgotPassword: {
    fontSize: Theme.fonts.sizes.s,
    color: Theme.colors.primary,
    textAlign: 'right',
    marginBottom: Theme.spacing.xl,
    fontWeight: Theme.fonts.medium.fontWeight,
  },
  loginButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: Theme.spacing.m,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: Theme.fonts.sizes.l,
    fontWeight: Theme.fonts.medium.fontWeight,
    color: Theme.colors.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Theme.colors.border },
  dividerText: {
    fontSize: Theme.fonts.sizes.s,
    color: Theme.colors.textSecondary,
    marginHorizontal: Theme.spacing.m,
    fontWeight: Theme.fonts.medium.fontWeight,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.m,
    marginBottom: Theme.spacing.xxl,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingVertical: Theme.spacing.m,
    borderRadius: 12,
    gap: Theme.spacing.s,
  },
  socialButtonIcon: { fontSize: Theme.fonts.sizes.l },
  socialButtonText: {
    fontSize: Theme.fonts.sizes.s,
    fontWeight: Theme.fonts.medium.fontWeight,
    color: Theme.colors.text,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signupText: { fontSize: Theme.fonts.sizes.m, color: Theme.colors.textSecondary },
  signupLink: {
    fontSize: Theme.fonts.sizes.m,
    fontWeight: Theme.fonts.bold.fontWeight,
    color: Theme.colors.primary,
  },
});
