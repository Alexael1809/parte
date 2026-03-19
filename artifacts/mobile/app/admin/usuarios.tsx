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
  Switch,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, Usuario, Peloton } from "@/lib/api";
import Colors from "@/constants/colors";

interface UsuarioForm {
  email: string;
  nombre: string;
  password: string;
  rol: "superusuario" | "estandar";
  pelotonId: number | null;
  activo: boolean;
}

const DEFAULT_FORM: UsuarioForm = { email: "", nombre: "", password: "", rol: "estandar", pelotonId: null, activo: true };

export default function UsuariosScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UsuarioForm>(DEFAULT_FORM);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => api.get<Usuario[]>("/usuarios"),
  });

  const { data: pelotones } = useQuery({
    queryKey: ["pelotones"],
    queryFn: () => api.get<Peloton[]>("/pelotones"),
  });

  const createMutation = useMutation({
    mutationFn: (data: UsuarioForm) => api.post("/usuarios", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["usuarios"] }); closeModal(); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UsuarioForm> }) => api.put(`/usuarios/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["usuarios"] }); closeModal(); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/usuarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setModalVisible(true);
  }

  function openEdit(u: Usuario) {
    setEditingId(u.id);
    setForm({ email: u.email, nombre: u.nombre, password: "", rol: u.rol as any, pelotonId: u.pelotonId, activo: u.activo });
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  function handleSave() {
    if (!form.email || !form.nombre || (!editingId && !form.password)) {
      Alert.alert("Error", "Complete todos los campos requeridos");
      return;
    }
    if (editingId) {
      const data: any = { email: form.email, nombre: form.nombre, rol: form.rol, pelotonId: form.pelotonId, activo: form.activo };
      if (form.password) data.password = form.password;
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(form);
    }
  }

  function confirmDelete(u: Usuario) {
    Alert.alert("Eliminar usuario", `¿Eliminar a ${u.nombre}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteMutation.mutate(u.id) },
    ]);
  }

  const botPad = insets.bottom;

  return (
    <View style={styles.container}>
      <Pressable style={styles.addBtn} onPress={openCreate}>
        <Ionicons name="person-add" size={18} color={Colors.navy} />
        <Text style={styles.addBtnText}>Nuevo Usuario</Text>
      </Pressable>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={usuarios ?? []}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 20 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.userCard, !item.activo && styles.userCardInactive]}>
              <View style={styles.userLeft}>
                <View style={[styles.avatar, item.rol === "superusuario" && styles.avatarAdmin]}>
                  <Ionicons name={item.rol === "superusuario" ? "shield" : "person"} size={20} color={item.rol === "superusuario" ? Colors.gold : Colors.grayText} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.nombre}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <Text style={styles.userMeta}>
                    {item.rol === "superusuario" ? "Administrador" : `Pelotón: ${item.pelotonNombre ?? "Sin asignar"}`}
                    {!item.activo && " • INACTIVO"}
                  </Text>
                </View>
              </View>
              <View style={styles.userActions}>
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
              <Ionicons name="people-outline" size={48} color={Colors.grayText} />
              <Text style={styles.emptyText}>No hay usuarios registrados</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: botPad + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingId ? "Editar Usuario" : "Nuevo Usuario"}</Text>

            {[
              { label: "Nombre completo", key: "nombre", placeholder: "Juan Pérez", keyboard: "default" },
              { label: "Email", key: "email", placeholder: "usuario@ejemplo.com", keyboard: "email-address" },
              { label: "Contraseña" + (editingId ? " (dejar vacío para no cambiar)" : ""), key: "password", placeholder: "••••••••", keyboard: "default" },
            ].map(({ label, key, placeholder, keyboard }) => (
              <View key={key} style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.grayText}
                  keyboardType={keyboard as any}
                  autoCapitalize="none"
                  secureTextEntry={key === "password"}
                />
              </View>
            ))}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Rol</Text>
              <View style={styles.rolSelector}>
                {(["estandar", "superusuario"] as const).map((rol) => (
                  <Pressable
                    key={rol}
                    style={[styles.rolOption, form.rol === rol && styles.rolOptionActive]}
                    onPress={() => setForm((prev) => ({ ...prev, rol }))}
                  >
                    <Text style={[styles.rolOptionText, form.rol === rol && styles.rolOptionTextActive]}>
                      {rol === "estandar" ? "Recolector" : "Administrador"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {form.rol === "estandar" && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Pelotón</Text>
                <ScrollSelector
                  options={pelotones?.map((p) => ({ label: `Pelotón ${p.nombre}`, value: p.id })) ?? []}
                  selected={form.pelotonId}
                  onSelect={(v) => setForm((prev) => ({ ...prev, pelotonId: v }))}
                />
              </View>
            )}

            {editingId && (
              <View style={styles.fieldGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>Usuario activo</Text>
                  <Switch
                    value={form.activo}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, activo: v }))}
                    trackColor={{ false: Colors.navyLight, true: Colors.green + "80" }}
                    thumbColor={form.activo ? Colors.green : Colors.grayText}
                  />
                </View>
              </View>
            )}

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
        </View>
      </Modal>
    </View>
  );
}

function ScrollSelector({ options, selected, onSelect }: { options: { label: string; value: number }[]; selected: number | null; onSelect: (v: number) => void }) {
  return (
    <View style={styles.scrollSelector}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          style={[styles.scrollOption, selected === opt.value && styles.scrollOptionActive]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.scrollOptionText, selected === opt.value && styles.scrollOptionTextActive]}>{opt.label}</Text>
        </Pressable>
      ))}
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
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  userCardInactive: { opacity: 0.6 },
  userLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarAdmin: { backgroundColor: Colors.gold + "20" },
  userInfo: { flex: 1 },
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  userEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.grayText, marginTop: 1 },
  userMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText + "80", marginTop: 2 },
  userActions: { flexDirection: "row", gap: 4 },
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
    maxHeight: "90%",
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.navyLight, alignSelf: "center", marginBottom: 8 },
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
  rolSelector: { flexDirection: "row", gap: 10 },
  rolOption: {
    flex: 1,
    backgroundColor: Colors.navyLight,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  rolOptionActive: { backgroundColor: Colors.gold + "20", borderWidth: 1, borderColor: Colors.gold },
  rolOptionText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.grayText },
  rolOptionTextActive: { color: Colors.gold, fontFamily: "Inter_600SemiBold" },
  scrollSelector: { gap: 8, maxHeight: 120 },
  scrollOption: {
    backgroundColor: Colors.navyLight,
    borderRadius: 8,
    padding: 10,
  },
  scrollOptionActive: { backgroundColor: Colors.gold + "20", borderWidth: 1, borderColor: Colors.gold },
  scrollOptionText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.grayText },
  scrollOptionTextActive: { color: Colors.gold, fontFamily: "Inter_600SemiBold" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: Colors.navyLight, borderRadius: 12, padding: 14, alignItems: "center" },
  modalCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.grayText },
  modalSave: { flex: 1, backgroundColor: Colors.gold, borderRadius: 12, padding: 14, alignItems: "center" },
  modalSaveText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.navy },
});
