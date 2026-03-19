import React, { useState } from "react";
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
  ScrollView,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, Peloton, Proceso, Pnf } from "@/lib/api";
import Colors from "@/constants/colors";

interface PelotonForm {
  nombre: string;
  procesoId: number | null;
  pnfId: number | null;
}

const DEFAULT_FORM: PelotonForm = { nombre: "", procesoId: null, pnfId: null };

export default function PelotonesScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PelotonForm>(DEFAULT_FORM);

  const { data: pelotones, isLoading } = useQuery({
    queryKey: ["pelotones"],
    queryFn: () => api.get<Peloton[]>("/pelotones"),
  });

  const { data: procesos } = useQuery({
    queryKey: ["procesos"],
    queryFn: () => api.get<Proceso[]>("/procesos"),
  });

  const { data: pnfs } = useQuery({
    queryKey: ["pnfs"],
    queryFn: () => api.get<Pnf[]>("/pnfs"),
  });

  const createMutation = useMutation({
    mutationFn: (data: PelotonForm) => api.post("/pelotones", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pelotones"] }); closeModal(); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PelotonForm> }) => api.put(`/pelotones/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pelotones"] }); closeModal(); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/pelotones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pelotones"] }),
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setModalVisible(true);
  }

  function openEdit(p: Peloton) {
    setEditingId(p.id);
    setForm({ nombre: p.nombre, procesoId: p.procesoId, pnfId: p.pnfId });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  function handleSave() {
    if (!form.nombre.trim() || !form.procesoId || !form.pnfId) {
      Alert.alert("Error", "Complete todos los campos");
      return;
    }
    if (editingId) { updateMutation.mutate({ id: editingId, data: form }); }
    else { createMutation.mutate(form); }
  }

  function confirmDelete(p: Peloton) {
    Alert.alert("Eliminar pelotón", `¿Eliminar pelotón ${p.nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
    ]);
  }

  const botPad = insets.bottom;

  return (
    <View style={styles.container}>
      <Pressable style={styles.addBtn} onPress={openCreate}>
        <Ionicons name="add-circle-outline" size={18} color={Colors.navy} />
        <Text style={styles.addBtnText}>Nuevo Pelotón</Text>
      </Pressable>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={pelotones ?? []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 20 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.pelotonBadge}>
                  <Text style={styles.pelotonBadgeText}>{item.nombre}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Pelotón {item.nombre}</Text>
                  <Text style={styles.cardMeta}>{item.pnfNombre}</Text>
                  <Text style={styles.cardMeta2}>{item.procesoNombre}</Text>
                  <View style={styles.personasCount}>
                    <Ionicons name="people" size={12} color={Colors.gold} />
                    <Text style={styles.personasCountText}>{item.totalPersonas} personas</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable onPress={() => openEdit(item)} style={styles.actionBtn}>
                  <Ionicons name="create-outline" size={18} color={Colors.gold} />
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color={Colors.red} />
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="grid-outline" size={48} color={Colors.grayText} />
              <Text style={styles.emptyText}>No hay pelotones registrados</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <ScrollView bounces={false}>
            <View style={[styles.modalSheet, { paddingBottom: botPad + 16 }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingId ? "Editar Pelotón" : "Nuevo Pelotón"}</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nombre del pelotón</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={form.nombre}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, nombre: v }))}
                  placeholder="Ej. A, B, C"
                  placeholderTextColor={Colors.grayText}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Proceso</Text>
                <View style={styles.chipGroup}>
                  {(procesos ?? []).map((p) => (
                    <Pressable
                      key={p.id}
                      style={[styles.chip, form.procesoId === p.id && styles.chipActive]}
                      onPress={() => setForm((prev) => ({ ...prev, procesoId: p.id }))}
                    >
                      <Text style={[styles.chipText, form.procesoId === p.id && styles.chipTextActive]}>{p.nombre}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PNF</Text>
                <View style={styles.chipGroup}>
                  {(pnfs ?? []).map((p) => (
                    <Pressable
                      key={p.id}
                      style={[styles.chip, form.pnfId === p.id && styles.chipActive]}
                      onPress={() => setForm((prev) => ({ ...prev, pnfId: p.id }))}
                    >
                      <Text style={[styles.chipText, form.pnfId === p.id && styles.chipTextActive]}>{p.nombre}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.modalButtons}>
                <Pressable style={styles.modalCancel} onPress={closeModal}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.modalSave} onPress={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  <Text style={styles.modalSaveText}>Guardar</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.navy },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    margin: 16,
    borderRadius: 12,
    padding: 14,
    justifyContent: "center",
  },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 16, gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  pelotonBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.gold + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  pelotonBadgeText: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.gold },
  cardInfo: { flex: 1 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  cardMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText },
  cardMeta2: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText + "80" },
  personasCount: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  personasCountText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.gold },
  cardActions: { flexDirection: "row" },
  actionBtn: { padding: 8 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.grayText },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.navyMid,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.navyLight, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.grayText, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    padding: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.white,
  },
  chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: Colors.navyLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: Colors.gold + "20", borderWidth: 1, borderColor: Colors.gold },
  chipText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.grayText },
  chipTextActive: { color: Colors.gold, fontFamily: "Inter_600SemiBold" },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, backgroundColor: Colors.navyLight, borderRadius: 12, padding: 14, alignItems: "center" },
  modalCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.grayText },
  modalSave: { flex: 1, backgroundColor: Colors.gold, borderRadius: 12, padding: 14, alignItems: "center" },
  modalSaveText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
});
