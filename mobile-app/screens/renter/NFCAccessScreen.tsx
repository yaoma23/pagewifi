import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '../../constants/Colors';
import { unlockESP32, ESP32Config } from '../../lib/esp32Client';
import { supabase } from '../../lib/supabaseClient';

// Initialize NFC Manager
NfcManager.start();

export default function NFCAccessScreen({ navigation, route }: any) {
  const { bookingId } = route.params || {};
  const [scanState, setScanState] = useState<'ready' | 'scanning' | 'success' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [esp32Config, setEsp32Config] = useState<ESP32Config | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim1 = useRef(new Animated.Value(0)).current;
  const rippleAnim2 = useRef(new Animated.Value(0)).current;
  const rippleAnim3 = useRef(new Animated.Value(0)).current;

  // Load ESP32 configuration from booking/property data
  useEffect(() => {
    const loadESP32Config = async () => {
      if (!bookingId) return;
      
      try {
        // Try to get ESP32 IP from property data
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('properties(esp32_ip)')
          .eq('id', bookingId)
          .single();

        if (bookingData?.properties?.esp32_ip) {
          setEsp32Config({ ip: bookingData.properties.esp32_ip });
        }
      } catch (error) {
        console.log('Could not load ESP32 config from property, using default');
      }
    };

    loadESP32Config();
  }, [bookingId]);

  // Cleanup NFC on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing NFC operations when component unmounts
      NfcManager.cancelTechnologyRequest().catch(() => {
        // Ignore cleanup errors
      });
    };
  }, []);

  useEffect(() => {
    if (scanState === 'scanning') {
      // Pulse animation for the main icon
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();

      // Ripple effect animations (multiple expanding rings)
      const ripple1 = Animated.loop(
        Animated.sequence([
          Animated.timing(rippleAnim1, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim1, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      const ripple2 = Animated.loop(
        Animated.sequence([
          Animated.delay(650),
          Animated.timing(rippleAnim2, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim2, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      const ripple3 = Animated.loop(
        Animated.sequence([
          Animated.delay(1300),
          Animated.timing(rippleAnim3, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(rippleAnim3, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

      ripple1.start();
      ripple2.start();
      ripple3.start();

      return () => {
        pulseLoop.stop();
        ripple1.stop();
        ripple2.stop();
        ripple3.stop();
      };
    }
  }, [scanState]);

  const handleStartScan = async () => {
    setScanState('scanning');
    setErrorMessage('');

    try {
      // Check if NFC is supported
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        throw new Error('NFC is not supported on this device');
      }

      // Request NFC technology
      await NfcManager.requestTechnology(NfcTech.Ndef);

      // Read NFC tag
      const tag = await NfcManager.getTag();
      console.log('📱 NFC Tag detected:', tag);

      // Stop NFC scanning
      await NfcManager.cancelTechnologyRequest();

      // Unlock ESP32
      const result = await unlockESP32(esp32Config || undefined);
      
      if (result.success) {
        setScanState('success');
        setTimeout(() => {
          if (bookingId) {
            navigation.navigate('StayDetails', { bookingId });
          } else {
            navigation.goBack();
          }
        }, 2000);
      } else {
        setErrorMessage(result.message || 'Failed to unlock');
        setScanState('error');
      }
    } catch (error: any) {
      console.error('NFC scan error:', error);
      
      // Handle specific error cases
      let errorMsg = 'Failed to scan NFC tag';
      if (error.message?.includes('User cancelled')) {
        errorMsg = 'NFC scan cancelled';
        setScanState('ready');
        return;
      } else if (error.message?.includes('not supported')) {
        errorMsg = 'NFC is not supported on this device';
      } else if (error.message?.includes('timeout')) {
        errorMsg = 'NFC scan timed out. Please try again.';
      } else if (error.message) {
        errorMsg = error.message;
      }

      setErrorMessage(errorMsg);
      setScanState('error');
      
      // Cancel any ongoing NFC operations
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {scanState === 'ready' && 'Access Key Box'}
          {scanState === 'scanning' && 'Hold Near Key Box'}
          {scanState === 'success' && 'Access Granted!'}
          {scanState === 'error' && 'Error'}
        </Text>
        <Text style={styles.subtitle}>
          {scanState === 'ready' && 'Tap the button below to activate NFC scanning'}
          {scanState === 'scanning' && 'Keep your phone close to the NFC tag'}
          {scanState === 'success' && 'Key box unlocked successfully'}
          {scanState === 'error' && errorMessage}
        </Text>

        <View style={styles.iconWrapper}>
          {/* Animated ripple rings */}
          {scanState === 'scanning' && (
            <>
              <Animated.View
                style={[
                  styles.rippleRing,
                  {
                    transform: [
                      {
                        scale: rippleAnim1.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.5],
                        }),
                      },
                    ],
                    opacity: rippleAnim1.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.6, 0.3, 0],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.rippleRing,
                  {
                    transform: [
                      {
                        scale: rippleAnim2.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.5],
                        }),
                      },
                    ],
                    opacity: rippleAnim2.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.6, 0.3, 0],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.rippleRing,
                  {
                    transform: [
                      {
                        scale: rippleAnim3.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2.5],
                        }),
                      },
                    ],
                    opacity: rippleAnim3.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.6, 0.3, 0],
                    }),
                  },
                ]}
              />
            </>
          )}

          {/* Main NFC icon */}
          <Animated.View
            style={[
              styles.nfcIcon,
              scanState === 'scanning' && { transform: [{ scale: pulseAnim }] },
              scanState === 'success' && styles.nfcIconSuccess,
              scanState === 'error' && styles.nfcIconError,
            ]}
          >
            {scanState === 'ready' && <Ionicons name="phone-portrait-outline" size={80} color={Colors.deepBlue} />}
            {scanState === 'scanning' && <Ionicons name="radio-outline" size={80} color={Colors.deepBlue} />}
            {scanState === 'success' && <Ionicons name="checkmark-circle-outline" size={80} color={Colors.emeraldGreen} />}
            {scanState === 'error' && <Ionicons name="close-circle-outline" size={80} color={Colors.error} />}
          </Animated.View>
        </View>

        {scanState === 'ready' && (
          <TouchableOpacity style={styles.scanButton} onPress={handleStartScan}>
            <Text style={styles.scanButtonText}>Start NFC Scan</Text>
          </TouchableOpacity>
        )}

        {scanState === 'scanning' && (
          <View style={styles.scanningIndicator}>
            <Text style={styles.scanningText}>Scanning...</Text>
          </View>
        )}

        {scanState === 'success' && (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>
              You can now access the keys from the key box
            </Text>
          </View>
        )}

        {scanState === 'error' && (
          <View style={styles.errorMessage}>
            <Text style={styles.errorText}>
              {errorMessage || 'An error occurred'}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => setScanState('ready')}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Instructions</Text>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumberContainer}>
              <Text style={styles.instructionNumber}>1</Text>
            </View>
            <Text style={styles.instructionText}>
              Locate the NFC-enabled key box at the property entrance
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumberContainer}>
              <Text style={styles.instructionNumber}>2</Text>
            </View>
            <Text style={styles.instructionText}>
              Tap "Start NFC Scan" and hold your phone near the reader
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumberContainer}>
              <Text style={styles.instructionNumber}>3</Text>
            </View>
            <Text style={styles.instructionText}>
              Wait for the confirmation and retrieve your keys
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  iconWrapper: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  nfcIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  nfcIconSuccess: {
    backgroundColor: Colors.emeraldLight,
  },
  nfcIconError: {
    backgroundColor: '#ffebee',
  },
  rippleRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: Colors.deepBlue,
  },
  scanButton: {
    backgroundColor: Colors.deepBlue,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    shadowColor: Colors.deepBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanButtonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  scanningIndicator: {
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  scanningText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.medium,
    color: Colors.deepBlue,
  },
  successMessage: {
    backgroundColor: Colors.emeraldLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  successText: {
    fontSize: FontSizes.base,
    color: Colors.emeraldGreen,
    fontWeight: FontWeights.medium,
    textAlign: 'center',
  },
  instructions: {
    width: '100%',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  instructionsTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  instructionNumberContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.deepBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  instructionNumber: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },
  instructionText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: FontSizes.base,
    color: '#c62828',
    fontWeight: FontWeights.medium,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.deepBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  retryButtonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
});
