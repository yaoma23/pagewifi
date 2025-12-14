import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  SafeAreaView,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes, FontWeights } from '../../constants/Colors';

export default function KeyReturnScreen({ navigation }: any) {
  const [returnState, setReturnState] = useState<'ready' | 'scanning' | 'success'>('ready');
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (returnState === 'scanning') {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Simulate NFC scan for key return
      const timer = setTimeout(() => {
        setReturnState('success');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [returnState]);

  const handleStartReturn = () => {
    setReturnState('scanning');
  };

  const handleComplete = () => {
    navigation.navigate('RenterHome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          {returnState === 'ready' && 'Return Keys'}
          {returnState === 'scanning' && 'Returning Keys...'}
          {returnState === 'success' && 'Keys Returned!'}
        </Text>
        <Text style={styles.subtitle}>
          {returnState === 'ready' && 'Place keys back in the key box and scan to check out'}
          {returnState === 'scanning' && 'Hold your phone near the key box'}
          {returnState === 'success' && 'Thank you for your stay!'}
        </Text>

        <Animated.View
          style={[
            styles.iconContainer,
            returnState === 'scanning' && { transform: [{ scale: pulseAnim }] },
            returnState === 'success' && styles.iconContainerSuccess,
          ]}
        >
          <Text style={styles.icon}>
            {returnState === 'ready' && '🔑'}
            {returnState === 'scanning' && '📡'}
            {returnState === 'success' && '✅'}
          </Text>
        </Animated.View>

        {returnState === 'ready' && (
          <View style={styles.checklistContainer}>
            <Text style={styles.checklistTitle}>Before you leave:</Text>
            <View style={styles.checklistItem}>
              <View style={styles.checkbox}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
              <Text style={styles.checklistText}>Turn off all lights</Text>
            </View>
            <View style={styles.checklistItem}>
              <View style={styles.checkbox}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
              <Text style={styles.checklistText}>Lock all windows and doors</Text>
            </View>
            <View style={styles.checklistItem}>
              <View style={styles.checkbox}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
              <Text style={styles.checklistText}>Adjust thermostat</Text>
            </View>
            <View style={styles.checklistItem}>
              <View style={styles.checkbox}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
              <Text style={styles.checklistText}>Take out trash</Text>
            </View>
            <View style={styles.checklistItem}>
              <View style={styles.checkbox}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
              <Text style={styles.checklistText}>Return keys to key box</Text>
            </View>
          </View>
        )}

        {returnState === 'ready' && (
          <TouchableOpacity
            style={styles.returnButton}
            onPress={handleStartReturn}
          >
            <Text style={styles.returnButtonText}>Scan to Return Keys</Text>
          </TouchableOpacity>
        )}

        {returnState === 'scanning' && (
          <View style={styles.scanningIndicator}>
            <Text style={styles.scanningText}>Scanning...</Text>
          </View>
        )}

        {returnState === 'success' && (
          <View style={styles.successContainer}>
            <View style={styles.successMessage}>
              <Text style={styles.successTitle}>Check-out Complete!</Text>
              <Text style={styles.successText}>
                Your keys have been successfully returned.
              </Text>
            </View>

            <View style={styles.feedbackPrompt}>
              <Text style={styles.feedbackTitle}>How was your stay?</Text>
              <Text style={styles.feedbackSubtitle}>
                We'd love to hear your feedback
              </Text>
              <View style={styles.ratingContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} style={styles.starButton}>
                    <Text style={styles.star}>⭐</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleComplete}
            >
              <Text style={styles.completeButtonText}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        )}

        {returnState !== 'success' && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1.</Text>
              <Text style={styles.instructionText}>
                Complete the checklist above before leaving
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2.</Text>
              <Text style={styles.instructionText}>
                Place all keys back into the key box
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3.</Text>
              <Text style={styles.instructionText}>
                Tap "Scan to Return Keys" and hold your phone near the NFC reader
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>4.</Text>
              <Text style={styles.instructionText}>
                Wait for confirmation before leaving
              </Text>
            </View>
          </View>
        )}
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
    paddingVertical: Spacing.sm,
  },
  backButtonText: {
    fontSize: FontSizes.base,
    color: Colors.deepBlue,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.base,
    color: Colors.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainerSuccess: {
    backgroundColor: Colors.emeraldLight,
  },
  icon: {
    fontSize: 70,
  },
  checklistContainer: {
    width: '100%',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  checklistTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.emeraldGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  checkmark: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  checklistText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  returnButton: {
    backgroundColor: Colors.emeraldGreen,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  returnButtonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  scanningIndicator: {
    marginBottom: Spacing.xl,
  },
  scanningText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.medium,
    color: Colors.emeraldGreen,
  },
  successContainer: {
    width: '100%',
    alignItems: 'center',
  },
  successMessage: {
    backgroundColor: Colors.emeraldLight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  successTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.emeraldGreen,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: FontSizes.base,
    color: Colors.emeraldGreen,
    textAlign: 'center',
  },
  feedbackPrompt: {
    width: '100%',
    backgroundColor: Colors.gray50,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  feedbackSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginBottom: Spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.sm,
  },
  star: {
    fontSize: 32,
  },
  completeButton: {
    backgroundColor: Colors.deepBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    width: '100%',
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },
  instructions: {
    width: '100%',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
  },
  instructionsTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  instructionNumber: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.semibold,
    color: Colors.emeraldGreen,
    marginRight: Spacing.sm,
    width: 20,
  },
  instructionText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    lineHeight: 20,
  },
});
