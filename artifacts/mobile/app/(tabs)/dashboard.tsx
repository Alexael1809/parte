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
import { api, PelotonStats } from "@/lib/api";
import Colors from "@/constants/colors";

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

interface DrillRowProps {
  label: string;
  value: number;
  h: number;
  m: number;
  color: string;
  onPress?: () => void;
}

function DrillRow({ label, value, h, m, color, onPress }: DrillRowProps) {
  const inner = (
    <View style={styles.statRowInner}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, onPress ? { color } : {}]}>{value}</Text>
      <Text style={styles.statGender}>(H:{h} | M:{m})</Text>
      {onPress && <Ionicons name="chevron-forward" size={13} color={color} style={{ marginLeft: 2 }} />}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {inner}
      </Pressable>
    );
  }
  return inner;
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
  const totalGlobalH = stats?.reduce((acc, s) => acc + s.presentesH + s.ausentesH + s.comisionesH + s.reposesH + s.pasantiasH + s.permisosH, 0) ?? 0;
  const totalGlobalM = stats?.reduce((acc, s) => acc + s.presentesM + s.ausentesM + s.comisionesM + s.reposesM + s.pasantiasM + s.permisosM, 0) ?? 0;
  const totalPresentes = stats?.reduce((acc, s) => acc + s.presentes, 0) ?? 0;
  const totalPresentesH = stats?.reduce((acc, s) => acc + s.presentesH, 0) ?? 0;
  const totalPresentesM = stats?.reduce((acc, s) => acc + s.presentesM, 0) ?? 0;
  const totalAusentes = stats?.reduce((acc, s) => acc + s.ausentes, 0) ?? 0;
  const totalAusentesH = stats?.reduce((acc, s) => acc + s.ausentesH, 0) ?? 0;
  const totalAusentesM = stats?.reduce((acc, s) => acc + s.ausentesM, 0) ?? 0;
  const totalReposos = stats?.reduce((acc, s) => acc + s.reposos, 0) ?? 0;
  const totalReposesH = stats?.reduce((acc, s) => acc + s.reposesH, 0) ?? 0;
  const totalReposesM = stats?.reduce((acc, s) => acc + s.reposesM, 0) ?? 0;
  const totalComisiones = stats?.reduce((acc, s) => acc + s.comisiones, 0) ?? 0;
  const totalComisionesH = stats?.reduce((acc, s) => acc + s.comisionesH, 0) ?? 0;
  const totalComisionesM = stats?.reduce((acc, s) => acc + s.comisionesM, 0) ?? 0;
  const totalPermisos = stats?.reduce((acc, s) => acc + (s.permisos ?? 0), 0) ?? 0;
  const totalPermisosH = stats?.reduce((acc, s) => acc + (s.permisosH ?? 0), 0) ?? 0;
  const totalPermisosM = stats?.reduce((acc, s) => acc + (s.permisosM ?? 0), 0) ?? 0;
  const totalPasantias = stats?.reduce((acc, s) => acc + s.pasantias, 0) ?? 0;
  const totalPasantiasH = stats?.reduce((acc, s) => acc + s.pasantiasH, 0) ?? 0;
  const totalPasantiasM = stats?.reduce((acc, s) => acc + s.pasantiasM, 0) ?? 0;

  function goToGlobal(estado: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/inasistentes/[pelotonId]",
      params: { pelotonId: "0", fecha, pelotonNombre: "Todos los Pelotones", estado },
    });
  }

  function goToDetalle(s: PelotonStats, estado: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/inasistentes/[pelotonId]",
      params: { pelotonId: s.pelotonId, fecha, pelotonNombre: s.pelotonNombre, estado },
    });
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.dateSelector}>
          <Ionicons name="calendar-outline" size={16} color={Colors.gold} />
          <Text style={styles.dateText}>{fecha}</Text>
        </View>
      </View>

      {/* Global Stats Row 1: Total, Presentes, Ausentes */}
      <View style={styles.globalStats}>
        <View style={styles.globalCard}>
          <Text style={styles.globalNum}>{totalGlobal}</Text>
          <Text style={styles.globalLabel}>Total</Text>
          <Text style={styles.globalGender}>H:{totalGlobalH} | M:{totalGlobalM}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.globalCard, { borderColor: Colors.green + "50", opacity: pressed ? 0.75 : 1 }]}
          onPress={() => goToGlobal("presente")}
        >
          <Text style={[styles.globalNum, { color: Colors.green }]}>{totalPresentes}</Text>
          <Text style={styles.globalLabel}>Presentes</Text>
          <Text style={styles.globalGender}>H:{totalPresentesH} | M:{totalPresentesM}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.globalCard, { borderColor: Colors.red + "50", opacity: pressed ? 0.75 : 1 }]}
          onPress={() => goToGlobal("ausente")}
        >
          <Text style={[styles.globalNum, { color: Colors.red }]}>{totalAusentes}</Text>
          <Text style={styles.globalLabel}>Ausentes</Text>
          <Text style={styles.globalGender}>H:{totalAusentesH} | M:{totalAusentesM}</Text>
        </Pressable>
      </View>

      {/* Status Cards Row */}
      <View style={styles.statusCardsRow}>
        <Pressable
          style={({ pressed }) => [styles.statusCard, { borderColor: Colors.orange + "50", opacity: pressed ? 0.75 : 1 }]}
          onPress={() => goToGlobal("reposo")}
        >
          <View style={[styles.statusIconCircle, { backgroundColor: Colors.orange + "20" }]}>
            <Ionicons name="bed" size={18} color={Colors.orange} />
          </View>
          <Text style={[styles.statusNum, { color: Colors.orange }]}>{totalReposos}</Text>
          <Text style={styles.statusTitle}>En Reposo</Text>
          <Text style={styles.statusSub}>H: {totalReposesH} | M: {totalReposesM}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.statusCard, { borderColor: Colors.blue + "50", opacity: pressed ? 0.75 : 1 }]}
          onPress={() => goToGlobal("comision")}
        >
          <View style={[styles.statusIconCircle, { backgroundColor: Colors.blue + "20" }]}>
            <Ionicons name="briefcase" size={18} color={Colors.blue} />
          </View>
          <Text style={[styles.statusNum, { color: Colors.blue }]}>{totalComisiones}</Text>
          <Text style={styles.statusTitle}>En Comisión</Text>
          <Text style={styles.statusSub}>H: {totalComisionesH} | M: {totalComisionesM}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.statusCard, { borderColor: Colors.teal + "50", opacity: pressed ? 0.75 : 1 }]}
          onPress={() => goToGlobal("permiso")}
        >
          <View style={[styles.statusIconCircle, { backgroundColor: Colors.teal + "20" }]}>
            <Ionicons name="document-text" size={18} color={Colors.teal} />
          </View>
          <Text style={[styles.statusNum, { color: Colors.teal }]}>{totalPermisos}</Text>
          <Text style={styles.statusTitle}>Permisos</Text>
          <Text style={styles.statusSub}>H: {totalPermisosH} | M: {totalPermisosM}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.statusCard, { borderColor: Colors.purple + "50", opacity: pressed ? 0.75 : 1 }]}
          onPress={() => goToGlobal("pasantia")}
        >
          <View style={[styles.statusIconCircle, { backgroundColor: Colors.purple + "20" }]}>
            <Ionicons name="school" size={18} color={Colors.purple} />
          </View>
          <Text style={[styles.statusNum, { color: Colors.purple }]}>{totalPasantias}</Text>
          <Text style={styles.statusTitle}>Pasantías</Text>
          <Text style={styles.statusSub}>H: {totalPasantiasH} | M: {totalPasantiasM}</Text>
        </Pressable>
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
                <Pressable
                  style={({ pressed }) => [styles.totalBadge, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => goToDetalle(s, "presente")}
                >
                  <Text style={styles.totalNum}>{s.total}</Text>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalGender}>H:{(s.presentesH + s.ausentesH + s.comisionesH + s.reposesH + s.pasantiasH + (s.permisosH ?? 0))} M:{(s.presentesM + s.ausentesM + s.comisionesM + s.reposesM + s.pasantiasM + (s.permisosM ?? 0))}</Text>
                </Pressable>
              </View>
              <View style={styles.divider} />
              <View style={styles.statsContainer}>
                <DrillRow
                  label="Presentes"
                  value={s.presentes}
                  h={s.presentesH}
                  m={s.presentesM}
                  color={Colors.green}
                  onPress={() => goToDetalle(s, "presente")}
                />
                <DrillRow
                  label="Ausentes"
                  value={s.ausentes}
                  h={s.ausentesH}
                  m={s.ausentesM}
                  color={Colors.red}
                  onPress={() => goToDetalle(s, "ausente")}
                />
                <DrillRow
                  label="Comisiones"
                  value={s.comisiones}
                  h={s.comisionesH}
                  m={s.comisionesM}
                  color={Colors.blue}
                  onPress={s.comisiones > 0 ? () => goToDetalle(s, "comision") : undefined}
                />
                <DrillRow
                  label="Reposos"
                  value={s.reposos}
                  h={s.reposesH}
                  m={s.reposesM}
                  color={Colors.orange}
                  onPress={s.reposos > 0 ? () => goToDetalle(s, "reposo") : undefined}
                />
                <DrillRow
                  label="Pasantías"
                  value={s.pasantias}
                  h={s.pasantiasH}
                  m={s.pasantiasM}
                  color={Colors.purple}
                  onPress={s.pasantias > 0 ? () => goToDetalle(s, "pasantia") : undefined}
                />
                <DrillRow
                  label="Permisos"
                  value={s.permisos ?? 0}
                  h={s.permisosH ?? 0}
                  m={s.permisosM ?? 0}
                  color={Colors.teal}
                  onPress={(s.permisos ?? 0) > 0 ? () => goToDetalle(s, "permiso") : undefined}
                />
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
    paddingBottom: 12,
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
    gap: 8,
    marginBottom: 10,
  },
  globalCard: {
    flex: 1,
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  globalNum: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.white },
  globalLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.grayText, marginTop: 2 },
  globalGender: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.grayText, marginTop: 1 },
  statusCardsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  statusCard: {
    flex: 1,
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 2,
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statusNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  statusTitle: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.white, textAlign: "center" },
  statusSub: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.grayText },
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
    padding: 14,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.white },
  cardMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText, marginTop: 2 },
  totalBadge: {
    alignItems: "center",
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  totalNum: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.gold },
  totalLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.grayText },
  totalGender: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.grayText },
  divider: { height: 1, backgroundColor: Colors.navyLight, marginHorizontal: 14 },
  statsContainer: { padding: 14, gap: 8 },
  statRowInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.grayText, flex: 1 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.white },
  statGender: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText },
  skeletonCard: { height: 180, backgroundColor: Colors.navyLight, borderRadius: 16 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.grayText },
});
