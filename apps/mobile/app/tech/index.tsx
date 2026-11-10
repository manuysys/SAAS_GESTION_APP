import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  Loading,
  Muted,
  Screen,
  SectionTitle,
  Title,
} from "@/src/components/ui";
import { api, ApiError } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { flushPendingActions, pendingCount } from "@/src/lib/offline";
import { colors, radius, spacing, type } from "@/src/lib/theme";
import type { TechWorkOrder } from "@/src/lib/types";

const statusLabels: Record<string, string> = {
  new: "Nueva",
  scheduled: "Programada",
  in_progress: "En ejecución",
  waiting: "En espera",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

const statusTones: Record<string, "neutral" | "success" | "warning" | "danger" | "teal"> = {
  new: "neutral",
  scheduled: "teal",
  in_progress: "warning",
  waiting: "teal",
  finished: "success",
  cancelled: "danger",
};

const filters = [
  { value: "", label: "Todas" },
  { value: "scheduled", label: "Programadas" },
  { value: "in_progress", label: "En ejecución" },
  { value: "waiting", label: "En espera" },
  { value: "finished", label: "Finalizadas" },
];

export default function TechScreen() {
  const { loading, techSession, techLogin, techLogout } = useAuth();

  if (loading) {
    return (
      <Screen scroll={false}>
        <Loading label="Cargando sesión..." />
      </Screen>
    );
  }

  if (!techSession) {
    return <TechLogin onLogin={techLogin} />;
  }

  return <TechJobs onLogout={techLogout} />;
}

function TechLogin({
  onLogin,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>← Volver</Text>
      </Pressable>
      <Title>Ingreso de técnico</Title>
      <Muted>Usá el usuario que te dio la empresa.</Muted>

      <Card>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="tecnico@empresa.com"
        />
        <Input
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          placeholder="••••••••"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Ingresar"
          onPress={submit}
          loading={submitting}
          disabled={!email.trim() || !password}
        />
        <Button
          title="Usar cuenta demo"
          variant="outline"
          onPress={() => {
            setEmail("tecnico@saasgestion.com");
            setPassword("Tecnico12345!");
          }}
        />
      </Card>
    </Screen>
  );
}

function TechJobs({ onLogout }: { onLogout: () => Promise<void> }) {
  const { techSession } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [pending, setPending] = useState(0);

  const tenant = techSession?.tenants.find((item) => item.id === techSession.tenantId);

  useEffect(() => {
    if (!techSession) return;
    void (async () => {
      setPending(await pendingCount(techSession.tenantId));
      const sent = await flushPendingActions(techSession.tenantId);
      if (sent > 0) setPending(await pendingCount(techSession.tenantId));
    })();
  }, [techSession]);

  const query = useQuery({
    queryKey: ["tech-jobs", techSession?.tenantId, filter],
    queryFn: () => api.techWorkOrders(techSession?.tenantId ?? "", filter || undefined),
    enabled: Boolean(techSession?.tenantId),
  });

  if (!techSession) return null;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>TÉCNICO</Text>
          <Text style={styles.headerTitle}>Mis trabajos</Text>
          <Muted>{tenant?.name ?? "Empresa"}</Muted>
        </View>
        <Pressable onPress={() => void onLogout()} accessibilityRole="button">
          <Text style={styles.logout}>Salir</Text>
        </Pressable>
      </View>

      {pending > 0 ? (
        <Badge label={`${pending} cambio(s) pendiente(s) de sincronizar`} tone="warning" />
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => {
          const active = filter === item.value;
          return (
            <Pressable
              key={item.value || "all"}
              onPress={() => setFilter(item.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {query.isLoading ? <Loading label="Cargando trabajos..." /> : null}
      {query.isError ? (
        <ErrorState
          message="No se pudieron cargar tus trabajos."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data?.items.length === 0 ? (
        <Card>
          <SectionTitle>Sin trabajos</SectionTitle>
          <Muted>Cuando te asignen una orden, aparece acá.</Muted>
        </Card>
      ) : null}

      {query.data?.items.map((order) => (
        <JobCard
          key={order.id}
          order={order}
          onPress={() =>
            router.push({ pathname: "/tech/job/[id]", params: { id: order.id } })
          }
        />
      ))}
    </Screen>
  );
}

function JobCard({ order, onPress }: { order: TechWorkOrder; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Abrir ${order.title}`}>
      <Card>
        <View style={styles.rowBetween}>
          <Badge label={statusLabels[order.operational_status] ?? order.operational_status} tone={statusTones[order.operational_status] ?? "neutral"} />
          <Text style={styles.code}>{order.code}</Text>
        </View>
        <Text style={styles.jobTitle}>{order.title}</Text>
        <Text style={styles.customer}>{order.customer_name ?? "Cliente"}</Text>
        <Muted>
          {order.scheduled_at
            ? `Programada: ${new Date(order.scheduled_at).toLocaleString("es-AR")}`
            : "Sin programar"}
        </Muted>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerText: { gap: 2, flex: 1 },
  eyebrow: { color: colors.teal, fontSize: type.tiny, fontWeight: "800", letterSpacing: 1.4 },
  headerTitle: { color: colors.ink, fontSize: 30, fontWeight: "700", letterSpacing: -0.8 },
  logout: { color: colors.danger, fontSize: type.small, fontWeight: "700", padding: spacing.sm },
  filters: { gap: spacing.sm, paddingVertical: spacing.xs },
  filter: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.mist,
    backgroundColor: colors.white,
  },
  filterActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.slate, fontSize: type.small, fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  code: { color: colors.slate, fontSize: type.tiny, fontFamily: "monospace" },
  jobTitle: { color: colors.ink, fontSize: type.body, fontWeight: "700", lineHeight: 21 },
  customer: { color: colors.slate, fontSize: type.small },
  back: { color: colors.teal, fontSize: type.small, fontWeight: "700" },
  error: { color: colors.danger, fontSize: type.small },
});
