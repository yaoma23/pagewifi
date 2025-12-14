import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import KeysScreen from "./KeysScreen";
import OwnerHomeScreen from "./OwnerHomeScreen";
import ProfileScreen from "../ProfileScreen";

const Tab = createBottomTabNavigator();

export default function OwnerDashboard() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide internal tab bar as we use the custom one in App.tsx
        tabBarActiveTintColor: "#1E3A8A",
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "Properties") iconName = "home";
          else if (route.name === "ManageKeys") iconName = "key";
          else if (route.name === "Profile") iconName = "person";

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Properties" component={OwnerHomeScreen} />
      <Tab.Screen name="ManageKeys" component={KeysScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
