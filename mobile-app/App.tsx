// App.tsx
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import BottomNavigation from './components/BottomNavigation';
import { UserProvider, useUser } from './context/UserContext';
import { AuthProvider, useAuth } from './lib/authContext';

// Screens
import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ProfileScreen from './screens/ProfileScreen';
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import SignupScreen from './screens/SignupScreen';
import SplashScreen from './screens/SplashScreen';
import OwnerDashboard from './screens/owner/OwnerDashboard';
import PropertyDetailsScreen from './screens/owner/PropertyDetailsScreen';
import BookingsScreen from './screens/renter/BookingsScreen';
import KeyReturnScreen from './screens/renter/KeyReturnScreen';
import NFCAccessScreen from './screens/renter/NFCAccessScreen';
import RenterHomeScreen from './screens/renter/RenterHomeScreen';
import StayDetailsScreen from './screens/renter/StayDetailsScreen';

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'yourapp://'],
  config: {
    screens: {
      Login: 'login-callback',
    },
  },
};

const Stack = createStackNavigator();

type Screen =
  | 'Splash'
  | 'Onboarding'
  | 'Login'
  | 'Signup'
  | 'RoleSelection'
  | 'RenterHome'
  | 'NFCAccess'
  | 'StayDetails'
  | 'KeyReturn'
  | 'Profile'
  | 'Bookings'
  | 'OwnerDashboard'
  | 'PropertyDetails';

// ---------- Small helpers for stacks ----------

function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        // 🔙 your old simple fade transition
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: { opacity: progress },
        }),
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    </Stack.Navigator>
  );
}

function AuthedStack({
  effectiveRole,
  setCurrentTab,
}: {
  effectiveRole: 'owner' | 'renter';
  setCurrentTab: (tab: string) => void;
}) {
  return (
    <Stack.Navigator
      initialRouteName={effectiveRole === 'owner' ? 'OwnerDashboard' : 'RenterHome'}
      screenOptions={{
        headerShown: false,
        // same fade transition for logged-in area
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: { opacity: progress },
        }),
      }}
    >
      {/* Renter flow */}
      <Stack.Screen
        name="RenterHome"
        component={RenterHomeScreen}
        listeners={() => ({ focus: () => setCurrentTab('home') })}
      />
      <Stack.Screen name="NFCAccess" component={NFCAccessScreen} />
      <Stack.Screen name="StayDetails" component={StayDetailsScreen} />
      <Stack.Screen name="KeyReturn" component={KeyReturnScreen} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        listeners={() => ({ focus: () => setCurrentTab('profile') })}
      />
      <Stack.Screen
        name="Bookings"
        component={BookingsScreen}
        listeners={() => ({ focus: () => setCurrentTab('bookings') })}
      />

      {/* Owner flow */}
      <Stack.Screen name="OwnerDashboard" component={OwnerDashboard} />
      <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
    </Stack.Navigator>
  );
}

// -------------------------
// Inner App content
// -------------------------
function AppContent() {
  const [currentTab, setCurrentTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState<Screen>('Splash');
  const { userRole } = useUser();
  const { user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Decide role: prefer database role from auth, fall back to UserContext
  const effectiveRole =
    (user?.role as 'owner' | 'renter' | null) ?? (userRole as 'owner' | 'renter' | null) ?? null;

  const renterScreensWithNav: Screen[] = ['RenterHome', 'Bookings'];
  const ownerScreensWithNav: Screen[] = ['OwnerDashboard'];

  const showBottomNav =
    !!effectiveRole &&
    ((effectiveRole === 'renter' && renterScreensWithNav.includes(currentScreen)) ||
      (effectiveRole === 'owner' && ownerScreensWithNav.includes(currentScreen)));

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <NavigationContainer
          ref={navigationRef}
          linking={linking}
          onStateChange={(state) => {
            const route = state?.routes[state.index];
            if (route) setCurrentScreen(route.name as Screen);
          }}
        >
          {/* If no user or no role -> auth flow with Splash/Onboarding/Login/etc. */}
          {/* Also show AuthStack if we're on RoleSelection screen (user might have default role but needs to select) */}
          {!user || !effectiveRole || currentScreen === 'RoleSelection' ? (
            <AuthStack />
          ) : (
            // If user exists -> owner/renter app
            <AuthedStack effectiveRole={effectiveRole} setCurrentTab={setCurrentTab} />
          )}
        </NavigationContainer>

        {/* BottomNavigation hooked up to the same navRef */}
        {showBottomNav && effectiveRole && (
          <BottomNavigation
            currentTab={currentTab}
            onTabChange={(tab) => {
              setCurrentTab(tab);

              if (effectiveRole === 'renter') {
                if (tab === 'home') navigationRef.current?.navigate('RenterHome');
                if (tab === 'bookings') navigationRef.current?.navigate('Bookings');
                if (tab === 'profile') navigationRef.current?.navigate('Profile');
              }

              if (effectiveRole === 'owner') {
                const ownerTabTargets: Record<string, { screen: string }> = {
                  dashboard: { screen: 'Properties' },
                  properties: { screen: 'ManageKeys' },
                  profile: { screen: 'Profile' },
                };
                const target = ownerTabTargets[tab];
                if (target) {
                  navigationRef.current?.navigate('OwnerDashboard', {
                    screen: target.screen,
                  });
                }
              }
            }}
            userRole={effectiveRole}
          />
        )}
      </View>
      <Toast />
    </SafeAreaProvider>
  );
}

// -------------------------
// Root App component
// -------------------------
export default function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </AuthProvider>
  );
}
