import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, PersonaEstadoItem, Estado } from "@/lib/api";
import Colors from "@/constants/colors";

const ESTADO_CONFIG: Record<string, { label: string; color: string; emptyIcon: string; emptyTitle: string; emptyText: string }> = {
  ausente: {
    label: "Ausentes",
    color: Colors.red,
    emptyIcon: "checkmark-circle",
    emptyTitle: "¡Sin ausentes!",
    emptyText: "Todos los miembros están presentes.",
  },
  comision: {
    label: "En Comisión",
    color: Colors.blue,
    emptyIcon: "briefcase-outline",
    emptyTitle: "Sin comisiones",
    emptyText: "No hay personal en comisión.",
  },
  reposo: {
    label: "En Reposo",
    color: Colors.orange,
    emptyIcon: "bed-outline",
    emptyTitle: "Sin reposos",
    emptyText: "No hay personal en reposo.",
  },
  pasantia: {
    label: "En Pasantía",
    color: Colors.purple,
    emptyIcon: "school-outline",
    emptyTitle: "Sin pasantías",
    emptyText: "No hay personal en pasantía.",
  },
};

export default function EstadoDetalleScreen() {
  const { pelotonId, fecha, pelotonNombre, estado = "ausente" } = useLocalSearchParams<{
    pelotonId: string;
    fecha: string;
    pelotonNombre: string;
    estado: string;
  }>();
  const insets = useSafeAreaInsets();

  const today = new Date().toISOString().split("T")[0];
  const fechaQuery = fecha || today;
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.ausente;

  const { data: personas, isLoading } = useQuery({
    queryKey: ["estado-detalle", pelotonId, fechaQuery, estado],
    queryFn: async () => {
      if (estado === "ausente") {
        return api.get<PersonaEstadoItem[]>(`/asistencias/inasistentes?fecha=${fechaQuery}&pelotonId=${pelotonId}`);
      }
      const asistencias = await api.get<any[]>(`/asistencias?pelotonId=${pelotonId}&fecha=${fechaQuery}&estado=${estado}`);
      return asistencias.map((a) => ({
        personaId: a.personaId,
        nombres: a.personaNombres,
        apellidos: a.personaApellidos,
        ci: a.personaCi,
        sexo: a.personaSexo,
        pelotonNombre: pelotonNombre ?? "",
        pnfNombre: "",
        procesoNombre: "",
        estado: a.estado,
        motivo: a.motivo ?? null,
      }));
    },
  });

  async function handleExport() {
    if (!personas || personas.length === 0) {
      Alert.alert("Sin datos", `No hay ${cfg.label.toLowerCase()} para exportar`);
      return;
    }
    const lines = [
      `LISTADO DE ${cfg.label.toUpperCase()} — Pelotón ${pelotonNombre} — ${fechaQuery}`,
      "=".repeat(50),
      "",
      ...personas.map((p, i) => {
        let line = `${i + 1}. ${p.nombres} ${p.apellidos}\n   CI: ${p.ci} | Sexo: ${p.sexo === "M" ? "Masculino" : "Femenino"}`;
        if (p.motivo) line += `\n   Motivo: ${p.motivo}`;
        return line;
      }),
      "",
      `Total: ${personas.length} ${cfg.label.toLowerCase()}`,
    ];
    await Share.share({ message: lines.join("\n") });
  }

  const botPad = insets.bottom;
  const showMotivo = estado !== "ausente";

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, { borderBottomColor: cfg.color + "40" }]}>
        <View style={styles.toolbarLeft}>
          <View style={[styles.estadoBadge, { backgroundColor: cfg.color + "20" }]}>
            <Text style={[styles.estadoBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.subtitle}>{fechaQuery} • {personas?.length ?? 0} personas</Text>
        </View>
        <Pressable style={[styles.exportBtn, { backgroundColor: cfg.color }]} onPress={handleExport}>
          <Ionicons name="share-outline" size={16} color={Colors.navy} />
          <Text style={styles.exportBtnText}>Exportar</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={personas ?? []}
          keyExtractor={(item) => item.personaId.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name={cfg.emptyIcon as any} size={56} color={cfg.color} />
              <Text style={styles.emptyTitle}>{cfg.emptyTitle}</Text>
              <Text style={styles.emptyText}>{cfg.emptyText}</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={({ pressed }) => [styles.personCard, { opacity: pressed ? 0.85 : 1, borderLeftColor: cfg.color, borderLeftWidth: 3 }]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/plan-busqueda/[personaId]", params: { personaId: item.personaId } });
              }}
            >
              <View style={[styles.indexBadge, { backgroundColor: cfg.color + "20" }]}>
                <Text style={[styles.indexText, { color: cfg.color }]}>{index + 1}</Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{item.nombres} {item.apellidos}</Text>
                <Text style={styles.personCI}>CI: {item.ci}</Text>
                {showMotivo && item.motivo ? (
                  <View style={styles.motivoRow}>
                    <Ionicons name="document-text-outline" size={11} color={cfg.color} />
                    <Text style={[styles.motivoText, { color: cfg.color }]}>{item.motivo}</Text>
                  </View>
                ) : showMotivo ? (
                  <Text style={styles.sinMotivo}>Sin motivo registrado</Text>
                ) : null}
              </View>
              <View style={styles.personRight}>
                <View style={[styles.sexoBadge, { backgroundColor: item.sexo === "M" ? Colors.blue + "20" : Colors.orange + "20" }]}>
                  <Ionicons name={item.sexo === "M" ? "male" : "female"} size={12} color={item.sexo === "M" ? Colors.blue : Colors.orange} />
                  <Text style={[styles.sexoText, { color: item.sexo === "M" ? Colors.blue : Colors.orange }]}>
                    {item.sexo === "M" ? "H" : "M"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.grayText} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.navyMid,
    borderBottomWidth: 1,
  },
  toolbarLeft: { flex: 1, gap: 4 },
  estadoBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 2,
  },
  estadoBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 0.5 },
  subtitle: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.grayText },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  exportBtnText: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.navy },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { padding: 16, gap: 10 },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  personInfo: { flex: 1, gap: 2 },
  personName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  personCI: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText },
  motivoRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  motivoText: { fontFamily: "Inter_500Medium", fontSize: 11, flex: 1 },
  sinMotivo: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText + "80", fontStyle: "italic" },
  personRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  sexoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sexoText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  emptyState: { alignItems: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.grayText },
});
