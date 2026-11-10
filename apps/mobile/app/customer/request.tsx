import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, Input, Muted, Screen, SectionTitle } from "@/src/components/ui";
import { api, ApiError } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, radius, spacing, type } from "@/src/lib/theme";

const priorities = [
  { value: "low", label: "Baja" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export default function CustomerRequestScreen() {
  const { customerSession } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");

  const mutation = useMutation({
    mutationFn: () =>
      api.portalCreateRequest(customerSession!, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["portal-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["portal-requests"] });
      Alert.alert("Solicitud enviada", "La empresa va a revisar tu pedido.");
      router.back();
    },
    onError: (error) =>
      Alert.alert(
        "No se pudo enviar",
        error instanceof ApiError ? error.message : "Intentá nuevamente.",
      ),
  });

  if (!customerSession) return <Redirect href="/customer" />;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>← Volver</Text>
      </Pressable>
      <Text style={styles.title}>Pedir un servicio</Text>
      <Muted>Contanos qué necesitás. La empresa te va a contactar.</Muted>

      <Card>
        <Input
          label="¿Qué necesitás?"
          value={title}
          onChangeText={setTitle}
          placeholder="Ej.: El aire acondicionado no enfría"
        />
        <Input
          label="Detalle"
          value={description}
          onChangeText={setDescription}
          placeholder="Contanos un poco más..."
          multiline
          style={{ minHeight: 100 }}
        />
        <SectionTitle>Prioridad</SectionTitle>
        <View style={styles.chips}>
          {priorities.map((item) => {
            const active = priority === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => setPriority(item.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Button
          title="Enviar solicitud"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!title.trim()}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.teal, fontSize: type.small, fontWeight: "700", paddingVertical: spacing.sm },
  title: { color: colors.ink, fontSize: 30, fontWeight: "700", letterSpacing: -0.8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.mist,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.slate, fontSize: type.small, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
});
