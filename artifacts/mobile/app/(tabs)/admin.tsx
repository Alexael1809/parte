import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

interface AdminItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
  color: string;
}

const getAdminItems = (isInvisible: boolean | undefined): AdminItem[] => {
  const baseItems: AdminItem[] = [
    {
      icon: "time",
      title: "Historial de Asistencias",
      subtitle: "Registro completo con búsqueda y filtros",
      route: "/admin/historial",
      color: Colors.gold,
    },
    {
      icon: "people",
      title: "Usuarios",
      subtitle: "Gestionar cuentas de usuario",
      route: "/admin/usuarios",
      color: Colors.blue,
    },
    {
      icon: "flag",
      title: "Procesos",
      subtitle: "Administrar procesos activos",
      route: "/admin/procesos",
      color: Colors.orange,
    },
    {
      icon: "grid",
      title: "Pelotones",
      subtitle: "Gestionar pelotones",
      route: "/admin/pelotones",
      color: Colors.green,
    },
    {
      icon: "person-add",
      title: "Personas",
      subtitle: "Registro de personal",
      route: "/admin/personas",
      color: Colors.purple,
    },
  ];

  // Mostrar calendario si isInvisible es estrictamente true
  if (isInvisible === true) {
    baseItems.unshift({
      icon: "calendar",
      title: "Calendario de Asistencias",
      subtitle: "Gestor avanzado de asistencias por fecha",
      route: "/admin/asistencias-calendario",
      color: Colors.teal,
    });
  }

  return baseItems;
};

export default function AdminScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Debug: verificar isInvisible
  console.log("[ADMIN] user?.isInvisible =", user?.isInvisible, "user?.rol =", user?.rol);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Administración</Text>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.grayText} />
        </Pressable>
      </View>

      <View style={styles.userCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={24} color={Colors.gold} />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.nombre}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>
        <View style={styles.superBadge}>
          <Ionicons name="shield-checkmark" size={12} color={Colors.navy} />
          <Text style={styles.superBadgeText}>Admin</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Gestión del Sistema</Text>

        {getAdminItems(user?.isInvisible).map((item) => (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.adminCard, { opacity: pressed ? 0.85 : 1 }]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route as any);
            }}
          >
            <View style={[styles.iconWrapper, { backgroundColor: item.color + "20" }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.grayText} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.white },
  logoutBtn: { padding: 8 },
  userCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.navyMid,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.gold + "30",
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gold + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: { flex: 1 },
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.white },
  userEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText, marginTop: 2 },
  superBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  superBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.navy },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 12 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.grayText,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  adminCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.navyMid,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.white },
  cardSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText, marginTop: 2 },
});
