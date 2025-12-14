import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, FontWeights, Spacing } from '../constants/Colors';

interface BottomNavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  userRole: 'owner' | 'renter';
}

export default function BottomNavigation({
  currentTab,
  onTabChange,
  userRole,
}: BottomNavigationProps) {
  // Define role-based tabs
  const renterTabs = [
    { id: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { id: 'bookings', label: 'Bookings', icon: 'calendar-outline', activeIcon: 'calendar' },
    { id: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  const ownerTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
    { id: 'properties', label: 'Keys', icon: 'business-outline', activeIcon: 'business' },
    { id: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  const tabs = userRole === 'renter' ? renterTabs : ownerTabs;

  return (
    <View style={styles.container}>
      <View style={styles.innerContainer}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => onTabChange(tab.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                <Ionicons
                  name={isActive ? tab.activeIcon as any : tab.icon as any}
                  size={24}
                  color={isActive ? Colors.deepBlue : Colors.gray500}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.white,
    borderRadius: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    paddingBottom: Platform.OS === 'ios' ? 0 : 0, // Reset padding as it's floating
  },
  innerContainer: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-around',
  },
  tab: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {
    backgroundColor: Colors.blueLight,
  },
  label: {
    fontSize: 10,
    fontWeight: FontWeights.medium,
    color: Colors.gray500,
  },
  labelActive: {
    color: Colors.deepBlue,
    fontWeight: FontWeights.semibold,
  },
});
