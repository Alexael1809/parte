import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, Persona, Asistencia, Estado } from "@/lib/api";
import Colors from "@/constants/colors";

const ESTADOS: { key: Estado; label: string; icon: string }[] = [
  { key: "inasistente", label: "Inasistente", icon: "close-circle" },
  { key: "presente", label: "Presente", icon: "checkmark-circle" },
  { key: "comision", label: "Comisión", icon: "briefcase" },
  { key: "reposo", label: "Reposo", icon: "bed" },
];

function getInitials(nombres: string, apellidos: string) {
  return `${nombres[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();
}

export default function AsistenciaScreen() {
  const { pelotonId, fecha: fechaParam } = useLocalSearchParams<{ pelotonId: string; fecha: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const fechaHoy = new Date().toISOString().split("T")[0];
  const [fecha, setFecha] = useState(fechaParam || fechaHoy);
  const [search, setSearch] = useState("");
  const [asistencias, setAsistencias] = useState<Record<number, { estado: Estado; motivo?: string }>>({});
  const [motivoModal, setMotivoModal] = useState<{ personaId: number; estado: Estado } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: personas, isLoading: loadingPersonas } = useQuery({
    queryKey: ["personas", pelotonId],
    queryFn: () => api.get<Persona[]>(`/personas?pelotonId=${pelotonId}`),
  });

  const { data: existingAsistencias } = useQuery({
    queryKey: ["asistencias", pelotonId, fecha],
    queryFn: () => api.get<Asistencia[]>(`/asistencias?pelotonId=${pelotonId}&fecha=${fecha}`),
    onSuccess: (data) => {
      const map: Record<number, { estado: Estado; motivo?: string }> = {};
      for (const a of data) {
        map[a.personaId] = { estado: a.estado, motivo: a.motivo ?? undefined };
      }
      setAsistencias(map);
    },
  } as any);

  function getPersonaEstado(personaId: number): Estado {
    return asistencias[personaId]?.estado ?? "inasistente";
  }

  function setEstado(personaId: number, estado: Estado) {
    if (estado === "comision" || estado === "reposo") {
      setMotivoModal({ personaId, estado });
      setMotivo(asistencias[personaId]?.motivo ?? "");
      return;
    }
    setAsistencias((prev) => ({ ...prev, [personaId]: { estado } }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function confirmMotivo() {
    if (!motivoModal) return;
    setAsistencias((prev) => ({
      ...prev,
      [motivoModal.personaId]: { estado: motivoModal.estado, motivo },
    }));
    setMotivoModal(null);
    setMotivo("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function saveAll() {
    if (!personas) return;
    setIsSaving(true);
    try {
      const registros = personas.map((p) => ({
        personaId: p.id,
        estado: asistencias[p.id]?.estado ?? "inasistente",
        motivo: asistencias[p.id]?.motivo ?? null,
      }));
      await api.post("/asistencias", { pelotonId: parseInt(pelotonId), fecha, registros });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Guardado", "Asistencia registrada correctamente");
      qc.invalidateQueries({ queryKey: ["asistencias"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsSaving(false);
    }
  }

  const filteredPersonas = personas?.filter(
    (p) =>
      p.nombres.toLowerCase().includes(search.toLowerCase()) ||
      p.apellidos.toLowerCase().includes(search.toLowerCase()) ||
      p.ci.includes(search)
  ) ?? [];

  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const counts = {
    presentes: Object.values(asistencias).filter((a) => a.estado === "presente").length,
    inasistentes: (personas?.length ?? 0) - Object.keys(asistencias).length + Object.values(asistencias).filter((a) => a.estado === "inasistente").length,
    comisiones: Object.values(asistencias).filter((a) => a.estado === "comision").length,
    reposos: Object.values(asistencias).filter((a) => a.estado === "reposo").length,
  };

  const renderItem = useCallback(({ item: persona }: { item: Persona }) => {
    const estado = getPersonaEstado(persona.id);
    const estadoColor = Colors.estados[estado];
    return (
      <View style={[styles.personaCard, { borderLeftColor: estadoColor.text, borderLeftWidth: 3 }]}>
        <Pressable
          onPress={() => router.push({ pathname: "/plan-busqueda/[personaId]", params: { personaId: persona.id } })}
          style={styles.personaLeft}
        >
          <View style={[styles.avatar, { backgroundColor: estadoColor.bg }]}>
            <Text style={[styles.avatarText, { color: estadoColor.text }]}>{getInitials(persona.nombres, persona.apellidos)}</Text>
          </View>
          <View style={styles.personaInfo}>
            <Text style={styles.personaNombre}>{persona.nombres} {persona.apellidos[0]}.</Text>
            <Text style={styles.personaCI}>CI: {persona.ci}</Text>
            <View style={styles.sexoBadge}>
              <Ionicons name={persona.sexo === "M" ? "male" : "female"} size={10} color={Colors.grayText} />
              <Text style={styles.sexoText}>{persona.sexo === "M" ? "Masculino" : "Femenino"}</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.estadoButtons}>
          {ESTADOS.map(({ key, icon }) => {
            const isActive = estado === key;
            const col = Colors.estados[key];
            return (
              <Pressable
                key={key}
                style={[styles.estadoBtn, isActive && { backgroundColor: col.bg }]}
                onPress={() => setEstado(persona.id, key)}
              >
                <Ionicons name={icon as any} size={20} color={isActive ? col.text : Colors.grayText + "60"} />
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }, [asistencias]);

  return (
    <View style={styles.container}>
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        {[
          { label: "P", count: counts.presentes, color: Colors.green },
          { label: "I", count: counts.inasistentes, color: Colors.red },
          { label: "C", count: counts.comisiones, color: Colors.blue },
          { label: "R", count: counts.reposos, color: Colors.orange },
          { label: "Total", count: personas?.length ?? 0, color: Colors.white },
        ].map(({ label, count, color }) => (
          <View key={label} style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color }]}>{count}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color={Colors.grayText} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o cédula..."
          placeholderTextColor={Colors.grayText}
          clearButtonMode="while-editing"
        />
      </View>

      {loadingPersonas ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredPersonas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 90 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={Colors.grayText} />
              <Text style={styles.emptyText}>Sin personas en este pelotón</Text>
            </View>
          }
        />
      )}

      {/* Save FAB */}
      <Pressable
        style={[styles.fab, { bottom: botPad + 20 }]}
        onPress={saveAll}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color={Colors.navy} />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={20} color={Colors.navy} />
            <Text style={styles.fabText}>GUARDAR</Text>
          </>
        )}
      </Pressable>

      {/* Motivo Modal */}
      <Modal visible={!!motivoModal} transparent animationType="slide" onRequestClose={() => setMotivoModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setMotivoModal(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              Motivo de {motivoModal?.estado === "comision" ? "Comisión" : "Reposo"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ingrese el motivo..."
              placeholderTextColor={Colors.grayText}
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancel} onPress={() => setMotivoModal(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmMotivo}>
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: Colors.navyMid,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontFamily: "Inter_700Bold", fontSize: 18 },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.grayText },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
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
  listContent: { paddingHorizontal: 16, gap: 10 },
  personaCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  personaLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  personaInfo: { flex: 1 },
  personaNombre: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  personaCI: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText },
  sexoBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  sexoText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.grayText },
  estadoButtons: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderLeftColor: Colors.navyLight,
  },
  estadoBtn: {
    width: 44,
    height: "100%" as any,
    minHeight: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.grayText },
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.navy, letterSpacing: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.navyMid,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.white },
  modalInput: {
    backgroundColor: Colors.navyLight,
    borderRadius: 12,
    padding: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.white,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancel: {
    flex: 1,
    backgroundColor: Colors.navyLight,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  modalCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.grayText },
  modalConfirm: {
    flex: 1,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  modalConfirmText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
});
