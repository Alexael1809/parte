import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, Persona, PlanBusqueda } from "@/lib/api";
import Colors from "@/constants/colors";

export default function PlanBusquedaScreen() {
  const { personaId } = useLocalSearchParams<{ personaId: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<PlanBusqueda>>({});

  const { data: persona } = useQuery({
    queryKey: ["persona", personaId],
    queryFn: () => api.get<Persona>(`/personas/${personaId}`),
  });

  const { data: plan, isLoading } = useQuery({
    queryKey: ["plan-busqueda", personaId],
    queryFn: () => api.get<PlanBusqueda>(`/personas/${personaId}/plan-busqueda`),
    onSuccess: (data) => {
      setEditData({
        telefono1: data.telefono1 ?? "",
        telefono2: data.telefono2 ?? "",
        telefono3: data.telefono3 ?? "",
        direccion: data.direccion ?? "",
        lugarOrigen: data.lugarOrigen ?? "",
      });
    },
  } as any);

  const mutation = useMutation({
    mutationFn: (data: Partial<PlanBusqueda>) => api.put(`/personas/${personaId}/plan-busqueda`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-busqueda", personaId] });
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Guardado", "Plan de búsqueda actualizado");
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  function handleSave() {
    mutation.mutate(editData);
  }

  async function handleShare() {
    if (!persona || !plan) return;
    const text = `PLAN DE BÚSQUEDA
Nombre: ${persona.nombres} ${persona.apellidos}
CI: ${persona.ci}
Pelotón: ${persona.pelotonNombre}
Sexo: ${persona.sexo === "M" ? "Masculino" : "Femenino"}

CONTACTOS:
${plan.telefono1 ? `Teléfono 1: ${plan.telefono1}` : ""}
${plan.telefono2 ? `Teléfono 2: ${plan.telefono2}` : ""}
${plan.telefono3 ? `Teléfono 3: ${plan.telefono3}` : ""}

UBICACIÓN:
Dirección: ${plan.direccion ?? "No registrada"}
Lugar de origen: ${plan.lugarOrigen ?? "No registrado"}`;

    try {
      await Share.share({ message: text });
    } catch (e) {}
  }

  if (isLoading || !persona) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.gold} size="large" />
      </View>
    );
  }

  const botPad = insets.bottom;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]} showsVerticalScrollIndicator={false}>
        {/* Person Header */}
        <View style={styles.personHeader}>
          <View style={styles.personAvatar}>
            <Ionicons name={persona.sexo === "M" ? "male" : "female"} size={28} color={Colors.gold} />
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{persona.nombres} {persona.apellidos}</Text>
            <Text style={styles.personCI}>CI: {persona.ci}</Text>
            <Text style={styles.personPeloton}>{persona.pelotonNombre}</Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call" size={16} color={Colors.gold} />
            <Text style={styles.sectionTitle}>Teléfonos de Contacto</Text>
          </View>
          {isEditing ? (
            <View style={styles.editGroup}>
              {["telefono1", "telefono2", "telefono3"].map((field, i) => (
                <View key={field} style={styles.editField}>
                  <Text style={styles.editLabel}>Teléfono {i + 1}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={(editData as any)[field] ?? ""}
                    onChangeText={(v) => setEditData((prev) => ({ ...prev, [field]: v }))}
                    placeholder={`Teléfono ${i + 1}`}
                    placeholderTextColor={Colors.grayText}
                    keyboardType="phone-pad"
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.infoGroup}>
              {[plan?.telefono1, plan?.telefono2, plan?.telefono3].map((tel, i) => (
                <View key={i} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tel. {i + 1}</Text>
                  <Text style={styles.infoValue}>{tel || "—"}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={16} color={Colors.gold} />
            <Text style={styles.sectionTitle}>Ubicación</Text>
          </View>
          {isEditing ? (
            <View style={styles.editGroup}>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Dirección</Text>
                <TextInput
                  style={[styles.editInput, styles.textArea]}
                  value={editData.direccion ?? ""}
                  onChangeText={(v) => setEditData((prev) => ({ ...prev, direccion: v }))}
                  placeholder="Dirección completa"
                  placeholderTextColor={Colors.grayText}
                  multiline
                  numberOfLines={2}
                />
              </View>
              <View style={styles.editField}>
                <Text style={styles.editLabel}>Lugar de Origen</Text>
                <TextInput
                  style={styles.editInput}
                  value={editData.lugarOrigen ?? ""}
                  onChangeText={(v) => setEditData((prev) => ({ ...prev, lugarOrigen: v }))}
                  placeholder="Ciudad, Estado"
                  placeholderTextColor={Colors.grayText}
                />
              </View>
            </View>
          ) : (
            <View style={styles.infoGroup}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue}>{plan?.direccion || "—"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lugar de origen</Text>
                <Text style={styles.infoValue}>{plan?.lugarOrigen || "—"}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isEditing ? (
            <>
              <Pressable style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <ActivityIndicator color={Colors.navy} />
                ) : (
                  <>
                    <Ionicons name="save" size={16} color={Colors.navy} />
                    <Text style={styles.saveBtnText}>Guardar</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={16} color={Colors.gold} />
                <Text style={styles.editBtnText}>Editar</Text>
              </Pressable>
              <Pressable style={styles.shareBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={16} color={Colors.navy} />
                <Text style={styles.shareBtnText}>Compartir</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.navy },
  content: { padding: 20, gap: 16 },
  personHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.navyMid,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.gold + "30",
  },
  personAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gold + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  personInfo: { flex: 1 },
  personName: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.white },
  personCI: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.grayText, marginTop: 2 },
  personPeloton: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.gold, marginTop: 4 },
  section: {
    backgroundColor: Colors.navyMid,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    gap: 14,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  infoGroup: { gap: 10 },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  infoLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.grayText, width: 100 },
  infoValue: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.white, flex: 1 },
  editGroup: { gap: 12 },
  editField: { gap: 6 },
  editLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.grayText, textTransform: "uppercase", letterSpacing: 0.5 },
  editInput: {
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    padding: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.white,
  },
  textArea: { minHeight: 72, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: 12 },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold + "20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gold + "50",
    padding: 14,
  },
  editBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.gold },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    padding: 14,
  },
  shareBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.navyLight,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.grayText },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    padding: 14,
  },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
});
