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
import { api, Persona, Peloton } from "@/lib/api";
import Colors from "@/constants/colors";

interface PersonaForm {
  nombres: string;
  apellidos: string;
  ci: string;
  sexo: "M" | "F";
  pelotonId: number | null;
}

const DEFAULT_FORM: PersonaForm = { nombres: "", apellidos: "", ci: "", sexo: "M", pelotonId: null };

export default function PersonasScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PersonaForm>(DEFAULT_FORM);
  const [search, setSearch] = useState("");
  const [filterPelotonId, setFilterPelotonId] = useState<number | null>(null);

  const { data: personas, isLoading } = useQuery({
    queryKey: ["personas-admin"],
    queryFn: () => api.get<Persona[]>("/personas"),
  });

  const { data: pelotones } = useQuery({
    queryKey: ["pelotones"],
    queryFn: () => api.get<Peloton[]>("/pelotones"),
  });

  const createMutation = useMutation({
    mutationFn: (data: PersonaForm) => api.post("/personas", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["personas-admin"] }); closeModal(); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PersonaForm> }) => api.put(`/personas/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["personas-admin"] }); closeModal(); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/personas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personas-admin"] });
      Alert.alert("Éxito", "Persona eliminada correctamente");
    },
    onError: (e: any) => {
      Alert.alert("Error al eliminar", e.message || "No se pudo eliminar la persona");
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setModalVisible(true);
  }

  function openEdit(p: Persona) {
    setEditingId(p.id);
    setForm({ nombres: p.nombres, apellidos: p.apellidos, ci: p.ci, sexo: p.sexo, pelotonId: p.pelotonId });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  function handleSave() {
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.ci.trim() || !form.pelotonId) {
      Alert.alert("Error", "Complete todos los campos");
      return;
    }
    if (editingId) { updateMutation.mutate({ id: editingId, data: form }); }
    else { createMutation.mutate(form); }
  }

  function confirmDelete(p: Persona) {
    Alert.alert("Eliminar persona", `¿Eliminar a ${p.nombres} ${p.apellidos}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
    ]);
  }

  const filtered = (personas ?? []).filter((p) => {
    const matchSearch = !search ||
      p.nombres.toLowerCase().includes(search.toLowerCase()) ||
      p.apellidos.toLowerCase().includes(search.toLowerCase()) ||
      p.ci.includes(search);
    const matchPeloton = !filterPelotonId || p.pelotonId === filterPelotonId;
    return matchSearch && matchPeloton;
  });

  const botPad = insets.bottom;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={Colors.grayText} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o CI..."
          placeholderTextColor={Colors.grayText}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        <Pressable
          style={[styles.filterChip, !filterPelotonId && styles.filterChipActive]}
          onPress={() => setFilterPelotonId(null)}
        >
          <Text style={[styles.filterChipText, !filterPelotonId && styles.filterChipTextActive]}>Todos</Text>
        </Pressable>
        {(pelotones ?? []).map((p) => (
          <Pressable
            key={p.id}
            style={[styles.filterChip, filterPelotonId === p.id && styles.filterChipActive]}
            onPress={() => setFilterPelotonId(p.id)}
          >
            <Text style={[styles.filterChipText, filterPelotonId === p.id && styles.filterChipTextActive]}>Pel. {p.nombre}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.addBtn} onPress={openCreate}>
        <Ionicons name="person-add" size={18} color={Colors.navy} />
        <Text style={styles.addBtnText}>Nueva Persona ({filtered.length} de {personas?.length ?? 0})</Text>
      </Pressable>

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
          renderItem={({ item }) => (
            <View style={styles.personCard}>
              <View style={[styles.avatar, { backgroundColor: item.sexo === "M" ? Colors.blue + "20" : Colors.orange + "20" }]}>
                <Ionicons name={item.sexo === "M" ? "male" : "female"} size={18} color={item.sexo === "M" ? Colors.blue : Colors.orange} />
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{item.nombres} {item.apellidos}</Text>
                <Text style={styles.personCI}>CI: {item.ci} • {item.pelotonNombre}</Text>
              </View>
              <View style={styles.personActions}>
                <Pressable onPress={() => openEdit(item)} style={styles.actionBtn} disabled={deleteMutation.isPending}>
                  <Ionicons name="create-outline" size={18} color={Colors.gold} />
                </Pressable>
                <Pressable 
                  onPress={() => confirmDelete(item)} 
                  style={[styles.actionBtn, deleteMutation.isPending && { opacity: 0.5 }]}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <ActivityIndicator color={Colors.red} size="small" />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color={Colors.red} />
                  )}
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={48} color={Colors.grayText} />
              <Text style={styles.emptyText}>{search ? "Sin resultados" : "No hay personas registradas"}</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
            <View style={[styles.modalSheet, { paddingBottom: botPad + 16 }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{editingId ? "Editar Persona" : "Nueva Persona"}</Text>

              {[
                { label: "Nombres", key: "nombres", placeholder: "María" },
                { label: "Apellidos", key: "apellidos", placeholder: "González" },
                { label: "Cédula de Identidad", key: "ci", placeholder: "12345678", keyboard: "numeric" },
              ].map(({ label, key, placeholder, keyboard }) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={(form as any)[key]}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.grayText}
                    keyboardType={keyboard as any ?? "default"}
                  />
                </View>
              ))}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Sexo</Text>
                <View style={styles.sexoSelector}>
                  {(["M", "F"] as const).map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.sexoOption, form.sexo === s && styles.sexoOptionActive]}
                      onPress={() => setForm((prev) => ({ ...prev, sexo: s }))}
                    >
                      <Ionicons name={s === "M" ? "male" : "female"} size={16} color={form.sexo === s ? Colors.gold : Colors.grayText} />
                      <Text style={[styles.sexoOptionText, form.sexo === s && styles.sexoOptionTextActive]}>
                        {s === "M" ? "Masculino" : "Femenino"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Pelotón</Text>
                <View style={styles.chipGroup}>
                  {(pelotones ?? []).map((p) => (
                    <Pressable
                      key={p.id}
                      style={[styles.chip, form.pelotonId === p.id && styles.chipActive]}
                      onPress={() => setForm((prev) => ({ ...prev, pelotonId: p.id }))}
                    >
                      <Text style={[styles.chipText, form.pelotonId === p.id && styles.chipTextActive]}>Pel. {p.nombre}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.modalButtons}>
                <Pressable style={styles.modalCancel} onPress={closeModal}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.modalSave} onPress={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? (
                    <ActivityIndicator color={Colors.navy} />
                  ) : (
                    <Text style={styles.modalSaveText}>Guardar</Text>
                  )}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    margin: 16,
    marginBottom: 8,
    backgroundColor: Colors.navyLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.white },
  filterScroll: { maxHeight: 48 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 8, alignItems: "center" },
  filterChip: {
    backgroundColor: Colors.navyMid,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  filterChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + "20" },
  filterChipText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText },
  filterChipTextActive: { color: Colors.gold, fontFamily: "Inter_600SemiBold" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 14,
    justifyContent: "center",
  },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 16, gap: 8 },
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  personInfo: { flex: 1 },
  personName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  personCI: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText, marginTop: 1 },
  personActions: { flexDirection: "row" },
  actionBtn: { padding: 8 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.grayText },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.navyMid,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 14,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.navyLight, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.white },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.grayText, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    padding: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.white,
  },
  sexoSelector: { flexDirection: "row", gap: 12 },
  sexoOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    padding: 12,
  },
  sexoOptionActive: { backgroundColor: Colors.gold + "20", borderWidth: 1, borderColor: Colors.gold },
  sexoOptionText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.grayText },
  sexoOptionTextActive: { color: Colors.gold, fontFamily: "Inter_600SemiBold" },
  chipGroup: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: Colors.navyLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: Colors.gold + "20", borderWidth: 1, borderColor: Colors.gold },
  chipText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.grayText },
  chipTextActive: { color: Colors.gold, fontFamily: "Inter_600SemiBold" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancel: { flex: 1, backgroundColor: Colors.navyLight, borderRadius: 12, padding: 14, alignItems: "center" },
  modalCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.grayText },
  modalSave: { flex: 1, backgroundColor: Colors.gold, borderRadius: 12, padding: 14, alignItems: "center" },
  modalSaveText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
});
