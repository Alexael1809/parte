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
import { api, PelotonStats } from "@/lib/api";
import Colors from "@/constants/colors";

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function StatRow({ label, value, h, m, color }: { label: string; value: number; h: number; m: number; color: string }) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statGender}>(H:{h} | M:{m})</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [fecha, setFecha] = useState(getTodayISO());
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["dashboard", fecha],
    queryFn: () => api.get<PelotonStats[]>(`/asistencias/dashboard?fecha=${fecha}`),
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const totalGlobal = stats?.reduce((acc, s) => acc + s.total, 0) ?? 0;
  const totalPresentes = stats?.reduce((acc, s) => acc + s.presentes, 0) ?? 0;
  const totalInasistentes = stats?.reduce((acc, s) => acc + s.inasistentes, 0) ?? 0;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.dateSelector}>
          <Ionicons name="calendar-outline" size={16} color={Colors.gold} />
          <Text style={styles.dateText}>{fecha}</Text>
        </View>
      </View>

      {/* Global Stats */}
      <View style={styles.globalStats}>
        <View style={styles.globalCard}>
          <Text style={styles.globalNum}>{totalGlobal}</Text>
          <Text style={styles.globalLabel}>Total</Text>
        </View>
        <View style={[styles.globalCard, { borderColor: Colors.green + "50" }]}>
          <Text style={[styles.globalNum, { color: Colors.green }]}>{totalPresentes}</Text>
          <Text style={styles.globalLabel}>Presentes</Text>
        </View>
        <View style={[styles.globalCard, { borderColor: Colors.red + "50" }]}>
          <Text style={[styles.globalNum, { color: Colors.red }]}>{totalInasistentes}</Text>
          <Text style={styles.globalLabel}>Inasistentes</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      >
        <Text style={styles.sectionTitle}>Desglose por Pelotón</Text>

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <View key={i} style={styles.skeletonCard} />)
        ) : !stats || stats.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={48} color={Colors.grayText} />
            <Text style={styles.emptyText}>Sin datos para esta fecha</Text>
          </View>
        ) : (
          stats.map((s) => (
            <View key={s.pelotonId} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardTitle}>PELOTÓN {s.pelotonNombre}</Text>
                  <Text style={styles.cardMeta}>{s.pnfNombre} — {s.procesoNombre}</Text>
                </View>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalNum}>{s.total}</Text>
                  <Text style={styles.totalLabel}>Total</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statsContainer}>
                <StatRow label="Presentes" value={s.presentes} h={s.presentesH} m={s.presentesM} color={Colors.green} />
                <Pressable
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/inasistentes/[pelotonId]", params: { pelotonId: s.pelotonId, fecha, pelotonNombre: s.pelotonNombre } });
                  }}
                >
                  <View style={styles.statRowPressable}>
                    <View style={[styles.statDot, { backgroundColor: Colors.red }]} />
                    <Text style={styles.statLabel}>Inasistentes</Text>
                    <Text style={[styles.statValue, { color: Colors.red }]}>{s.inasistentes}</Text>
                    <Text style={styles.statGender}>(H:{s.inasistentesH} | M:{s.inasistentesM})</Text>
                    <Ionicons name="search" size={14} color={Colors.red} style={{ marginLeft: 4 }} />
                  </View>
                </Pressable>
                <StatRow label="Comisiones" value={s.comisiones} h={s.comisionesH} m={s.comisionesM} color={Colors.blue} />
                <StatRow label="Reposos" value={s.reposos} h={s.reposesH} m={s.reposesM} color={Colors.orange} />
              </View>
            </View>
          ))
        )}
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
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.gold },
  globalStats: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 24,
  },
  globalCard: {
    flex: 1,
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  globalNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: Colors.white,
  },
  globalLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.grayText,
    marginTop: 2,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 14 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.grayText,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.navyMid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.white },
  cardMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText, marginTop: 2 },
  totalBadge: {
    alignItems: "center",
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  totalNum: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.gold },
  totalLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.grayText },
  divider: { height: 1, backgroundColor: Colors.navyLight, marginHorizontal: 16 },
  statsContainer: { padding: 16, gap: 10 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statRowPressable: { flexDirection: "row", alignItems: "center", gap: 8 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.grayText, flex: 1 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.white },
  statGender: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText },
  skeletonCard: { height: 160, backgroundColor: Colors.navyLight, borderRadius: 16 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.grayText },
});
