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
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

interface Proceso {
  id: number;
  nombre: string;
  activo: boolean;
  fechaArchivado: string | null;
  createdAt: string;
}

export default function ProcesosScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const { data: procesos, isLoading } = useQuery({
    queryKey: ["procesos", showArchived],
    queryFn: () => api.get<Proceso[]>(`/procesos?includeArchived=${showArchived}`),
  });

  const createMutation = useMutation({
    mutationFn: (n: string) => api.post("/procesos", { nombre: n }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procesos"] }); closeModal(); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, n }: { id: number; n: string }) => api.put(`/procesos/${id}`, { nombre: n }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["procesos"] }); closeModal(); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/procesos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["procesos"] }),
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  function openCreate() {
    setEditingId(null);
    setNombre("");
    setModalVisible(true);
  }

  function openEdit(p: Proceso) {
    setEditingId(p.id);
    setNombre(p.nombre);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingId(null);
    setNombre("");
  }

  function handleSave() {
    if (!nombre.trim()) { Alert.alert("Error", "El nombre es requerido"); return; }
    if (editingId) { updateMutation.mutate({ id: editingId, n: nombre }); }
    else { createMutation.mutate(nombre); }
  }

  function confirmArchive(p: Proceso) {
    Alert.alert("Archivar proceso", `¿Archivar "${p.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Archivar", style: "destructive", onPress: () => archiveMutation.mutate(p.id) },
    ]);
  }

  const botPad = insets.bottom;
  const activeProcesos = procesos?.filter(p => p.activo) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarText}>{activeProcesos.length} procesos activos (máx. 3)</Text>
        <Pressable
          style={styles.archivedToggle}
          onPress={() => setShowArchived(!showArchived)}
        >
          <Text style={styles.archivedToggleText}>{showArchived ? "Ver activos" : "Ver archivados"}</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.addBtn, activeProcesos.length >= 3 && styles.addBtnDisabled]} onPress={() => activeProcesos.length < 3 ? openCreate() : Alert.alert("Límite", "Solo se permiten 3 procesos activos")}>
        <Ionicons name="add-circle-outline" size={18} color={Colors.navy} />
        <Text style={styles.addBtnText}>Nuevo Proceso</Text>
      </Pressable>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={procesos ?? []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 20 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.procesoCard, !item.activo && styles.procesoCardArchived]}>
              <View style={styles.procesoLeft}>
                <View style={[styles.statusDot, { backgroundColor: item.activo ? Colors.green : Colors.grayText }]} />
                <View style={styles.procesoInfo}>
                  <Text style={styles.procesoNombre}>{item.nombre}</Text>
                  <Text style={styles.procesoMeta}>{item.activo ? "Activo" : `Archivado el ${item.fechaArchivado?.split("T")[0]}`}</Text>
                </View>
              </View>
              {item.activo && (
                <View style={styles.procesoActions}>
                  <Pressable onPress={() => openEdit(item)} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={18} color={Colors.gold} />
                  </Pressable>
                  <Pressable onPress={() => confirmArchive(item)} style={styles.actionBtn}>
                    <Ionicons name="archive-outline" size={18} color={Colors.red} />
                  </Pressable>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={48} color={Colors.grayText} />
              <Text style={styles.emptyText}>No hay procesos registrados</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: botPad + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingId ? "Editar Proceso" : "Nuevo Proceso"}</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nombre del proceso</Text>
              <TextInput
                style={styles.fieldInput}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Proceso 1-2025"
                placeholderTextColor={Colors.grayText}
                autoFocus
              />
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
        </View>
      </Modal>
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
    paddingVertical: 10,
    backgroundColor: Colors.navyMid,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
  },
  toolbarText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText },
  archivedToggle: { padding: 6 },
  archivedToggleText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.gold },
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
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 16, gap: 10 },
  procesoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  procesoCardArchived: { opacity: 0.6 },
  procesoLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  procesoInfo: { flex: 1 },
  procesoNombre: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.white },
  procesoMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText, marginTop: 2 },
  procesoActions: { flexDirection: "row", gap: 4 },
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
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancel: { flex: 1, backgroundColor: Colors.navyLight, borderRadius: 12, padding: 14, alignItems: "center" },
  modalCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.grayText },
  modalSave: { flex: 1, backgroundColor: Colors.gold, borderRadius: 12, padding: 14, alignItems: "center" },
  modalSaveText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
});
