// screens/SplashScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Colors } from "../constants/Colors";
import { useAuth } from "../lib/authContext";

import { Logo } from "../components/Logo";

export default function SplashScreen({ navigation }: any) {
  const { user, loading } = useAuth();

  const scaleAnim = useRef(new Animated.Value(2)).current;
  const [authReady, setAuthReady] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const hasNavigated = useRef(false);

  // Scale-in animation for the logo
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Minimum time to keep splash on screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimePassed(true);
    }, 1800); // ~1.8s minimum

    return () => clearTimeout(timer);
  }, []);

  // Mark auth as ready once loading finishes
  useEffect(() => {
    if (!loading) {
      setAuthReady(true);
    }
  }, [loading]);

  // Navigate once: auth ready + min time passed + not already navigated
  useEffect(() => {
    if (!authReady || !minTimePassed || hasNavigated.current) return;

    hasNavigated.current = true;

    // No user -> go to onboarding
    if (!user) {
      navigation.replace("Onboarding"); // slide transition
      return;
    }

    // User exists -> decide initial route based on role
    let initialRoute: string = "RoleSelection";

    // Only navigate to dashboard if role is explicitly set (not null/undefined)
    if (user.role === "owner") {
      initialRoute = "OwnerDashboard";
    } else if (user.role === "renter") {
      initialRoute = "RenterHome";
    } else {
      // No role or null role -> go to RoleSelection
      initialRoute = "RoleSelection";
    }

    navigation.replace(initialRoute); // slide transition
  }, [authReady, minTimePassed, user, navigation]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logo,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Logo width="100%" height="100%" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 500,
    height: 500,
  },
});
