import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

export default function TabLayout() {
  const { isSuperusuario } = useAuth();
  const admin = isSuperusuario();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.grayText,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : Colors.navyMid,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.navyLight,
          elevation: 0,
          height: isWeb ? 60 : undefined,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          href: admin ? undefined : null,
          tabBarIcon: ({ color }) => <Ionicons name="bar-chart" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          href: admin ? undefined : null,
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
