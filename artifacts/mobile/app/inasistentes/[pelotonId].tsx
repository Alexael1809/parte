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
import { api, InasistentePerson } from "@/lib/api";
import Colors from "@/constants/colors";

export default function InasistentesScreen() {
  const { pelotonId, fecha, pelotonNombre } = useLocalSearchParams<{
    pelotonId: string;
    fecha: string;
    pelotonNombre: string;
  }>();
  const insets = useSafeAreaInsets();

  const today = new Date().toISOString().split("T")[0];
  const fechaQuery = fecha || today;

  const { data: inasistentes, isLoading } = useQuery({
    queryKey: ["inasistentes", pelotonId, fechaQuery],
    queryFn: () => api.get<InasistentePerson[]>(`/asistencias/inasistentes?fecha=${fechaQuery}&pelotonId=${pelotonId}`),
  });

  async function handleExport() {
    if (!inasistentes || inasistentes.length === 0) {
      Alert.alert("Sin datos", "No hay inasistentes para exportar");
      return;
    }
    const lines = [
      `LISTADO DE INASISTENTES — Pelotón ${pelotonNombre} — ${fechaQuery}`,
      "=" .repeat(50),
      "",
      ...inasistentes.map(
        (p, i) =>
          `${i + 1}. ${p.nombres} ${p.apellidos}\n   CI: ${p.ci} | Sexo: ${p.sexo === "M" ? "Masculino" : "Femenino"}`
      ),
      "",
      `Total: ${inasistentes.length} inasistentes`,
    ];
    await Share.share({ message: lines.join("\n") });
  }

  const botPad = insets.bottom;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.subtitle}>{fechaQuery} • {inasistentes?.length ?? 0} inasistentes</Text>
        <Pressable style={styles.exportBtn} onPress={handleExport}>
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
          data={inasistentes ?? []}
          keyExtractor={(item) => item.personaId.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 20 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={56} color={Colors.green} />
              <Text style={styles.emptyTitle}>¡Sin inasistentes!</Text>
              <Text style={styles.emptyText}>Todos los miembros están presentes.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={({ pressed }) => [styles.personCard, { opacity: pressed ? 0.85 : 1 }]}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/plan-busqueda/[personaId]", params: { personaId: item.personaId } });
              }}
            >
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{index + 1}</Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{item.nombres} {item.apellidos}</Text>
                <Text style={styles.personCI}>CI: {item.ci}</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.navyMid,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
  },
  subtitle: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.grayText },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.gold,
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
    backgroundColor: Colors.red + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.red },
  personInfo: { flex: 1 },
  personName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  personCI: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText, marginTop: 2 },
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
