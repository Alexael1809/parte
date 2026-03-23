import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

const ESTADO_COLORS: Record<string, { color: string; label: string }> = {
  presente: { color: Colors.green, label: "Presente" },
  ausente: { color: Colors.red, label: "Ausente" },
  comision: { color: Colors.blue, label: "Comisión" },
  reposo: { color: Colors.orange, label: "Reposo" },
  pasantia: { color: Colors.purple, label: "Pasantía" },
  permiso: { color: Colors.teal, label: "Permiso" },
};

interface AsistenciaDetalle {
  id: number;
  fecha: string;
  estado: string;
  motivo: string | null;
  createdAt: string;
}

interface PersonaHistorial {
  personaId: number;
  nombres: string;
  apellidos: string;
  ci: string;
  sexo: string;
  pelotonId: number;
  pelotonNombre: string;
  pnfNombre: string;
  asistencias: AsistenciaDetalle[];
}

export default function HistorialDetalleScreen() {
  const { personaId } = useLocalSearchParams<{ personaId: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: persona, isLoading, refetch } = useQuery({
    queryKey: ["historial-detalle", personaId],
    queryFn: () => api.get<PersonaHistorial>(`/asistencias/persona/${personaId}`),
  });

  async function handleDelete(asistenciaId: number) {
    Alert.alert(
      "Eliminar Registro",
      "¿Está seguro de que desea eliminar este registro de asistencia?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(asistenciaId);
            try {
              await api.delete(`/asistencias/${asistenciaId}`);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await refetch();
              qc.invalidateQueries({ queryKey: ["historial"] });
            } catch (e: any) {
              Alert.alert("Error", e.message);
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  if (!persona) {
    return (
      <View style={[styles.container, { paddingTop: topPad, justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.errorText}>Persona no encontrada</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.personaNombre}>{persona.nombres} {persona.apellidos}</Text>
          <Text style={styles.personaMeta}>CI: {persona.ci} • {persona.sexo === "M" ? "H" : "M"}</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pelotón</Text>
          <Text style={styles.infoValue}>{persona.pelotonNombre}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>PNF</Text>
          <Text style={styles.infoValue}>{persona.pnfNombre}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total de registros</Text>
          <Text style={styles.infoValue}>{persona.asistencias.length}</Text>
        </View>
      </View>

      {/* Historia */}
      <Text style={styles.sectionTitle}>Historial de Asistencias (De más antiguo a más nuevo)</Text>

      <FlatList
        data={persona.asistencias}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={Colors.grayText} />
            <Text style={styles.emptyText}>Sin registros de asistencia</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = ESTADO_COLORS[item.estado] ?? { color: Colors.grayText, label: item.estado };
          const esEliminable = item.estado === "ausente" || item.estado === "permiso" || item.estado === "comision" || item.estado === "reposo" || item.estado === "pasantia";
          return (
            <View style={[styles.itemCard, { borderLeftColor: cfg.color, borderLeftWidth: 3 }]}>
              <View style={styles.itemTop}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemDate}>{item.fecha}</Text>
                  <View style={[styles.estadoBadge, { backgroundColor: cfg.color + "20" }]}>
                    <Text style={[styles.estadoText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                {esEliminable && deleting !== item.id && (
                  <Pressable
                    onPress={() => handleDelete(item.id)}
                    style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.red} />
                  </Pressable>
                )}
                {deleting === item.id && (
                  <ActivityIndicator color={Colors.gold} size="small" />
                )}
              </View>
              {item.motivo && (
                <View style={styles.motivoRow}>
                  <Ionicons name="document-text-outline" size={12} color={cfg.color} />
                  <Text style={[styles.motivoText, { color: cfg.color }]}>{item.motivo}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1 },
  personaNombre: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white },
  personaMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText, marginTop: 2 },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.grayText },
  infoValue: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.white },
  divider: { height: 1, backgroundColor: Colors.navyLight, marginVertical: 6 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.grayText,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContent: { paddingHorizontal: 12, gap: 8 },
  itemCard: {
    backgroundColor: Colors.navyMid,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    gap: 6,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLeft: { flex: 1, gap: 4 },
  itemDate: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.white },
  estadoBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  estadoText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  deleteBtn: { padding: 6 },
  motivoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  motivoText: { fontFamily: "Inter_500Medium", fontSize: 11, flex: 1 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.grayText },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.red },
});
