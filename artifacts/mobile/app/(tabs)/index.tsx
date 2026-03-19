import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { api, Peloton } from "@/lib/api";
import Colors from "@/constants/colors";

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-VE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const today = getTodayISO();

  const { data: pelotones, isLoading, refetch } = useQuery({
    queryKey: ["pelotones"],
    queryFn: () => api.get<Peloton[]>("/pelotones"),
  });

  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myPeloton = pelotones?.find((p) => p.id === user?.pelotonId);
  const displayPelotones = user?.rol === "superusuario" ? pelotones ?? [] : myPeloton ? [myPeloton] : [];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bienvenido,</Text>
          <Text style={styles.userName}>{user?.nombre}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={Colors.grayText} />
        </Pressable>
      </View>

      {/* Date Card */}
      <View style={styles.dateCard}>
        <View style={styles.dateLeft}>
          <Ionicons name="calendar" size={18} color={Colors.gold} />
          <Text style={styles.dateText}>{formatDate(new Date())}</Text>
        </View>
        <View style={[styles.rolBadge, user?.rol === "superusuario" && styles.rolBadgeAdmin]}>
          <Text style={styles.rolText}>{user?.rol === "superusuario" ? "Admin" : "Recolector"}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      >
        <Text style={styles.sectionTitle}>
          {user?.rol === "superusuario" ? "Todos los Pelotones" : "Mi Pelotón"}
        </Text>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard} />
          ))
        ) : displayPelotones.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Colors.grayText} />
            <Text style={styles.emptyText}>No hay pelotones asignados</Text>
          </View>
        ) : (
          displayPelotones.map((peloton) => (
            <PelotonCard key={peloton.id} peloton={peloton} today={today} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PelotonCard({ peloton, today }: { peloton: Peloton; today: string }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pelotonCard, { opacity: pressed ? 0.9 : 1 }]}
      onPress={async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/asistencia/[pelotonId]", params: { pelotonId: peloton.id, fecha: today } });
      }}
    >
      <View style={styles.pelotonCardTop}>
        <View style={styles.pelotonInfo}>
          <Text style={styles.pelotonNombre}>PELOTÓN {peloton.nombre}</Text>
          <Text style={styles.pelotonMeta}>{peloton.pnfNombre}</Text>
          <Text style={styles.pelotonMeta2}>{peloton.procesoNombre}</Text>
        </View>
        <View style={styles.pelotonRight}>
          <View style={styles.totalBadge}>
            <Ionicons name="people" size={14} color={Colors.gold} />
            <Text style={styles.totalText}>{peloton.totalPersonas}</Text>
          </View>
        </View>
      </View>
      <View style={styles.pelotonCta}>
        <Ionicons name="clipboard-outline" size={16} color={Colors.navy} />
        <Text style={styles.pelotonCtaText}>TOMAR ASISTENCIA HOY</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.navy} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.navy,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.grayText,
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.white,
  },
  logoutBtn: {
    padding: 8,
  },
  dateCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: Colors.navyLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dateText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.grayText,
    flex: 1,
  },
  rolBadge: {
    backgroundColor: Colors.navyMid,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.grayText + "30",
  },
  rolBadgeAdmin: {
    borderColor: Colors.gold + "50",
    backgroundColor: Colors.gold + "15",
  },
  rolText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 14,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.grayText,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  pelotonCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  pelotonCardTop: {
    flexDirection: "row",
    padding: 18,
    alignItems: "center",
    gap: 12,
  },
  pelotonInfo: {
    flex: 1,
    gap: 4,
  },
  pelotonNombre: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  pelotonMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.grayText,
  },
  pelotonMeta2: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.grayText + "80",
  },
  pelotonRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.gold + "20",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  totalText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.gold,
  },
  pelotonCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    paddingVertical: 12,
  },
  pelotonCtaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.navy,
    letterSpacing: 1,
  },
  skeletonCard: {
    height: 120,
    backgroundColor: Colors.navyLight,
    borderRadius: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.grayText,
  },
});
