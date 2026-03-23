import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, HistorialItem } from "@/lib/api";
import Colors from "@/constants/colors";

const ESTADOS_FILTER = [
  { key: "", label: "Todos" },
  { key: "presente", label: "Presentes", color: Colors.green },
  { key: "ausente", label: "Ausentes", color: Colors.red },
  { key: "comision", label: "Comisión", color: Colors.blue },
  { key: "reposo", label: "Reposo", color: Colors.orange },
  { key: "pasantia", label: "Pasantía", color: Colors.purple },
  { key: "permiso", label: "Permisos", color: Colors.teal },
];

const ESTADO_COLORS: Record<string, { color: string; label: string }> = {
  presente: { color: Colors.green, label: "Presente" },
  ausente: { color: Colors.red, label: "Ausente" },
  comision: { color: Colors.blue, label: "Comisión" },
  reposo: { color: Colors.orange, label: "Reposo" },
  pasantia: { color: Colors.purple, label: "Pasantía" },
  permiso: { color: Colors.teal, label: "Permiso" },
};

export default function HistorialScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [fechaFilter, setFechaFilter] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (estadoFilter) params.set("estado", estadoFilter);
    if (fechaFilter) params.set("fecha", fechaFilter);
    return `/asistencias/historial?${params.toString()}`;
  }, [estadoFilter, fechaFilter]);

  const { data: historial, isLoading, refetch } = useQuery({
    queryKey: ["historial", estadoFilter, fechaFilter],
    queryFn: () => api.get<HistorialItem[]>(queryUrl),
  });

  const filtered = useMemo(() => {
    if (!historial) return [];
    if (!search.trim()) return historial;
    const q = search.toLowerCase();
    return historial.filter(
      (h) =>
        h.nombres.toLowerCase().includes(q) ||
        h.apellidos.toLowerCase().includes(q) ||
        h.ci.toLowerCase().includes(q) ||
        h.pelotonNombre.toLowerCase().includes(q) ||
        h.pnfNombre.toLowerCase().includes(q)
    );
  }, [historial, search]);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.title}>Historial de Asistencias</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color={Colors.grayText} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre, CI o pelotón..."
          placeholderTextColor={Colors.grayText}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.grayText} />
          </Pressable>
        )}
      </View>

      {/* Fecha Filter */}
      <View style={styles.fechaRow}>
        <Ionicons name="calendar-outline" size={15} color={Colors.grayText} />
        <TextInput
          style={styles.fechaInput}
          value={fechaFilter}
          onChangeText={setFechaFilter}
          placeholder="Filtrar por fecha (YYYY-MM-DD)"
          placeholderTextColor={Colors.grayText}
        />
        {fechaFilter.length > 0 && (
          <Pressable onPress={() => setFechaFilter("")}>
            <Ionicons name="close-circle" size={16} color={Colors.grayText} />
          </Pressable>
        )}
      </View>

      {/* Estado Filter Chips */}
      <View style={styles.filterRow}>
        {ESTADOS_FILTER.map((f) => {
          const isActive = estadoFilter === f.key;
          const color = f.color ?? Colors.gold;
          return (
            <Pressable
              key={f.key}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: color + "25", borderColor: color },
              ]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEstadoFilter(f.key);
              }}
            >
              <Text style={[styles.filterChipText, isActive && { color }]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {isLoading ? "Cargando..." : `${filtered.length} registros`}
        </Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={15} color={Colors.grayText} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={Colors.grayText} />
              <Text style={styles.emptyText}>Sin registros</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cfg = ESTADO_COLORS[item.estado] ?? { color: Colors.grayText, label: item.estado };
            return (
              <View style={[styles.itemCard, { borderLeftColor: cfg.color, borderLeftWidth: 3 }]}>
                <View style={styles.itemTop}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>{item.nombres} {item.apellidos}</Text>
                    <Text style={styles.itemCI}>CI: {item.ci} • {item.sexo === "M" ? "H" : "M"}</Text>
                    <Text style={styles.itemPeloton}>{item.pelotonNombre}{item.pnfNombre ? ` · ${item.pnfNombre}` : ""}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <View style={[styles.estadoBadge, { backgroundColor: cfg.color + "20" }]}>
                      <Text style={[styles.estadoBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.itemFecha}>{item.fecha}</Text>
                  </View>
                </View>
                {item.motivo ? (
                  <View style={styles.motivoRow}>
                    <Ionicons name="document-text-outline" size={11} color={cfg.color} />
                    <Text style={[styles.motivoText, { color: cfg.color }]} numberOfLines={2}>{item.motivo}</Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white, flex: 1 },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: Colors.navyLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.white,
  },
  fechaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
  },
  fechaInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.white,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterChip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    backgroundColor: Colors.navyMid,
  },
  filterChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.grayText,
  },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  resultsText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText },
  refreshBtn: { padding: 4 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 16, gap: 8 },
  itemCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    gap: 6,
  },
  itemTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  itemLeft: { flex: 1, gap: 2 },
  itemName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  itemCI: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText },
  itemPeloton: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText },
  itemRight: { alignItems: "flex-end", gap: 4 },
  estadoBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  estadoBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  itemFecha: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.grayText },
  motivoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  motivoText: { fontFamily: "Inter_500Medium", fontSize: 11, flex: 1 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.grayText },
});
