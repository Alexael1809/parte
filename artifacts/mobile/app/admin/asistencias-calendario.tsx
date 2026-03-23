import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api, Persona, Estado } from "@/lib/api";
import Colors from "@/constants/colors";

const ESTADOS: { estado: Estado; label: string; color: string }[] = [
  { estado: "presente", label: "Presente", color: Colors.green },
  { estado: "ausente", label: "Ausente", color: Colors.red },
  { estado: "comision", label: "Comisión", color: Colors.blue },
  { estado: "reposo", label: "Reposo", color: Colors.orange },
  { estado: "pasantia", label: "Pasantía", color: Colors.purple },
  { estado: "permiso", label: "Permiso", color: Colors.teal },
];

interface AsistenciaItem {
  personaId: number;
  nombres: string;
  apellidos: string;
  ci: string;
  estado: Estado;
  motivo: string | null;
}

interface CalendarDay {
  day: number;
  date: string;
  isCurrentMonth: boolean;
}

export default function AsistenciasCalendarioScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [showPersonasModal, setShowPersonasModal] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [selectedEstado, setSelectedEstado] = useState<Estado | null>(null);
  const [motivoText, setMotivoText] = useState("");
  const [searchText, setSearchText] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: personas, isLoading: loadingPersonas } = useQuery({
    queryKey: ["personas-calendario"],
    queryFn: () => api.get<Persona[]>("/personas"),
  });

  // Filtrar personas basado en searchText
  const filteredPersonas = useMemo(() => {
    if (!personas) return [];
    if (!searchText.trim()) return personas;
    
    const query = searchText.toLowerCase();
    return personas.filter((p) =>
      p.nombres.toLowerCase().includes(query) ||
      p.apellidos.toLowerCase().includes(query) ||
      p.ci.toLowerCase().includes(query)
    );
  }, [personas, searchText]);

  const dateString = selectedDate.toISOString().split("T")[0];

  const { data: asistencias } = useQuery({
    queryKey: ["asistencias-fecha", dateString],
    queryFn: () => api.get(`/asistencias?fecha=${dateString}`),
  });

  const updateAsistenciaMutation = useMutation({
    mutationFn: (data: {
      pelotonId: number;
      fecha: string;
      registros: Array<{ personaId: number; estado: Estado; motivo: string | null }>;
    }) => api.post("/asistencias", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asistencias-fecha"] });
      setShowEstadoModal(false);
      Alert.alert("Éxito", "Asistencia actualizada");
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const selectedPersona = personas?.find((p) => p.id === selectedPersonaId);

  const handleChangeEstado = async (estado: Estado) => {
    if (!selectedPersona) return;

    setSelectedEstado(estado);
    if (estado === "reposo" || estado === "permiso" || estado === "pasantia") {
      setShowEstadoModal(true);
    } else {
      saveAsistencia(estado, null);
    }
  };

  const saveAsistencia = (estado: Estado, motivo: string | null) => {
    if (!selectedPersona) return;

    updateAsistenciaMutation.mutate({
      pelotonId: selectedPersona.pelotonId,
      fecha: dateString,
      registros: [{ personaId: selectedPersona.id, estado, motivo }],
    });
    setMotivoText("");
    setShowEstadoModal(false);
  };

  const handleSaveWithMotivo = () => {
    if (!selectedEstado) return;
    if (!motivoText.trim()) {
      Alert.alert("Error", "Por favor ingresa un motivo");
      return;
    }
    saveAsistencia(selectedEstado, motivoText.trim());
  };

  const getCalendarDays = (): CalendarDay[] => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    let current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push({
        day: current.getDate(),
        date: current.toISOString().split("T")[0],
        isCurrentMonth: current.getMonth() === month,
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const calendarDays = getCalendarDays();
  const currentAsistencia = asistencias?.find(
    (a: any) => a.personaId === selectedPersonaId
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.title}>Calendario de Asistencias</Text>
      </View>

      {/* Selector de Persona */}
      <Pressable
        onPress={() => setShowPersonasModal(true)}
        style={styles.personaSelector}
      >
        <View style={styles.personaSelectorContent}>
          <Ionicons name="person-outline" size={18} color={Colors.gold} />
          <Text style={styles.personaSelectorText}>
            {selectedPersona ? `${selectedPersona.nombres} ${selectedPersona.apellidos}` : "Selecciona una persona"}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={Colors.grayText} />
      </Pressable>

      {/* Navegación de Mes */}
      <View style={styles.monthNav}>
        <Pressable
          onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
          style={styles.monthBtn}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.gold} />
        </Pressable>
        <Text style={styles.monthTitle}>
          {selectedDate.toLocaleString("es-ES", { month: "long", year: "numeric" })}
        </Text>
        <Pressable
          onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
          style={styles.monthBtn}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.gold} />
        </Pressable>
      </View>

      {/* Calendario */}
      {selectedPersona ? (
        <ScrollView style={styles.calendarContainer} showsVerticalScrollIndicator={false}>
          {/* Encabezados de días */}
          <View style={styles.daysHeader}>
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
              <Text key={day} style={styles.dayHeaderText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Grid de días */}
          <View style={styles.daysGrid}>
            {calendarDays.map((dayItem) => {
              const isSelected = dayItem.date === dateString;
              const isToday = dayItem.date === new Date().toISOString().split("T")[0];

              return (
                <Pressable
                  key={dayItem.date}
                  onPress={() => setSelectedDate(new Date(dayItem.date + "T00:00:00"))}
                  style={[
                    styles.dayCell,
                    !dayItem.isCurrentMonth && { opacity: 0.3 },
                    isSelected && styles.daySelected,
                    isToday && styles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.daySelectedText,
                      !dayItem.isCurrentMonth && { color: Colors.grayText },
                    ]}
                  >
                    {dayItem.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Estados para la fecha seleccionada */}
          <View style={styles.estadosSection}>
            <Text style={styles.estadosSectionTitle}>
              {selectedDate.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </Text>

            <View style={styles.estadosGrid}>
              {ESTADOS.map((item) => (
                <Pressable
                  key={item.estado}
                  onPress={() => handleChangeEstado(item.estado)}
                  style={[
                    styles.estadoButton,
                    { borderColor: item.color },
                    currentAsistencia?.estado === item.estado && styles.estadoButtonActive,
                  ]}
                  disabled={updateAsistenciaMutation.isPending}
                >
                  {updateAsistenciaMutation.isPending && currentAsistencia?.estado === item.estado ? (
                    <ActivityIndicator color={item.color} size="small" />
                  ) : (
                    <>
                      <View
                        style={[
                          styles.estadoColor,
                          { backgroundColor: item.color },
                          currentAsistencia?.estado === item.estado && { opacity: 1 },
                        ]}
                      />
                      <Text
                        style={[
                          styles.estadoButtonText,
                          currentAsistencia?.estado === item.estado && { color: item.color, fontWeight: "700" },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </>
                  )}
                </Pressable>
              ))}
            </View>

            {currentAsistencia?.motivo && (
              <View style={styles.motivoBox}>
                <Ionicons name="document-text-outline" size={14} color={Colors.grayText} />
                <Text style={styles.motivoText}>{currentAsistencia.motivo}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={Colors.grayText} />
          <Text style={styles.emptyText}>Selecciona una persona para ver su calendario</Text>
        </View>
      )}

      {/* Modal de Personas */}
      <Modal visible={showPersonasModal} transparent animationType="slide" onRequestClose={() => {
        setShowPersonasModal(false);
        setSearchText("");
      }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%", paddingBottom: botPad }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Selecciona una Persona</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, apellido o CI..."
              placeholderTextColor={Colors.grayText}
              value={searchText}
              onChangeText={setSearchText}
            />

            {loadingPersonas ? (
              <ActivityIndicator color={Colors.gold} size="large" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={filteredPersonas}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setSelectedPersonaId(item.id);
                      setShowPersonasModal(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.personaOption,
                      selectedPersonaId === item.id && styles.personaOptionActive,
                    ]}
                  >
                    <View style={styles.personaOptionContent}>
                      <Text style={styles.personaOptionName}>
                        {item.nombres} {item.apellidos}
                      </Text>
                      <Text style={styles.personaOptionMeta}>
                        CI: {item.ci} • {item.pelotonNombre}
                      </Text>
                    </View>
                    {selectedPersonaId === item.id && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                    )}
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Motivo */}
      <Modal visible={showEstadoModal} transparent animationType="fade" onRequestClose={() => setShowEstadoModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.motvoModalContent, { paddingBottom: botPad }]}>
            <Text style={styles.modalTitle}>Ingresa un motivo</Text>
            <Text style={styles.modalSubtitle}>
              Para: {selectedEstado === "reposo" ? "Reposo" : selectedEstado === "permiso" ? "Permiso" : "Pasantía"}
            </Text>

            <View style={styles.motivoInputWrapper}>
              <Text style={styles.inputLabel}>Motivo/Razón</Text>
              <Text
                style={[styles.textInput, { minHeight: 80, paddingVertical: 12 }]}
                onLongPress={() => {}}
              >
                {motivoText}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowEstadoModal(false)} style={[styles.modalBtn, styles.modalBtnCancel]}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveWithMotivo}
                style={[styles.modalBtn, styles.modalBtnSave]}
                disabled={!motivoText.trim() || updateAsistenciaMutation.isPending}
              >
                {updateAsistenciaMutation.isPending ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: Colors.navy }]}>Guardar</Text>
                )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.white },
  personaSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.navyMid,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.navyLight,
  },
  personaSelectorContent: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  personaSelectorText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white, flex: 1 },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  monthBtn: { padding: 6 },
  monthTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.white },
  calendarContainer: { flex: 1, paddingHorizontal: 16 },
  daysHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.grayText,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 4,
  },
  daySelected: { backgroundColor: Colors.gold },
  dayToday: { borderWidth: 2, borderColor: Colors.gold },
  dayText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.white },
  daySelectedText: { color: Colors.navy, fontWeight: "700" },
  estadosSection: { paddingBottom: 20 },
  estadosSectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.grayText,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  estadosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  estadoButton: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    gap: 4,
  },
  estadoButtonActive: { backgroundColor: "rgba(200, 150, 12, 0.1)" },
  estadoColor: { width: 6, height: 6, borderRadius: 3 },
  estadoButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.grayText,
    textAlign: "center",
  },
  motivoBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    backgroundColor: Colors.navyMid,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
  },
  motivoText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.white, flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.grayText },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.navy,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInput: {
    backgroundColor: Colors.navyMid,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.white,
  },
  motvoModalContent: {
    backgroundColor: Colors.navy,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    maxHeight: "60%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.navyLight,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.white, marginBottom: 12 },
  modalSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.grayText, marginBottom: 12 },
  personaOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.navyLight,
  },
  personaOptionActive: { backgroundColor: Colors.navyMid },
  personaOptionContent: { flex: 1 },
  personaOptionName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.white },
  personaOptionMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.grayText, marginTop: 2 },
  motivoInputWrapper: { marginBottom: 16 },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.white,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.navyMid,
    borderWidth: 1,
    borderColor: Colors.navyLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: Colors.white,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalBtnCancel: { backgroundColor: Colors.navyMid, borderWidth: 1, borderColor: Colors.navyLight },
  modalBtnSave: { backgroundColor: Colors.gold },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.white },
});
