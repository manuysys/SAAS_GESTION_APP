import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button, Card, Screen } from "@/src/components/ui";
import { colors, radius, spacing, type } from "@/src/lib/theme";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>A</Text>
        </View>
        <Text style={styles.brand}>Arreglo</Text>
        <Text style={styles.heroTitle}>Del primer llamado al último cobro, todo en orden.</Text>
        <Text style={styles.heroText}>
          La app para técnicos y clientes de empresas de servicios técnicos.
        </Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>¿Cómo querés entrar?</Text>
        <Button title="Soy técnico" onPress={() => router.push("/tech")} />
        <Button
          title="Soy cliente"
          variant="secondary"
          onPress={() => router.push("/customer")}
        />
        <Text style={styles.hint}>
          Técnicos: órdenes, visitas, fotos y materiales. Clientes: solicitudes, turnos y
          presupuestos.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  brand: { color: "#fff", fontSize: type.title, fontWeight: "700", letterSpacing: -0.4 },
  heroTitle: {
    color: "#fff",
    fontSize: type.display,
    fontWeight: "700",
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  heroText: { color: "rgba(255,255,255,0.72)", fontSize: type.body, lineHeight: 22 },
  cardTitle: { color: colors.ink, fontSize: type.title, fontWeight: "700" },
  hint: { color: colors.slate, fontSize: type.small, lineHeight: 19 },
});
