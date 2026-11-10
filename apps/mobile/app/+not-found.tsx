import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, type } from "@/src/lib/theme";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.title}>No encontramos esta pantalla</Text>
      <Text style={styles.text}>Volvé al inicio de Arreglo.</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Ir al inicio</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.paper,
    gap: spacing.sm,
  },
  code: { color: colors.teal, fontSize: type.tiny, fontWeight: "800", letterSpacing: 2 },
  title: { color: colors.ink, fontSize: type.title, fontWeight: "700", textAlign: "center" },
  text: { color: colors.slate, fontSize: type.body, textAlign: "center" },
  link: { marginTop: spacing.md },
  linkText: { color: colors.teal, fontSize: type.body, fontWeight: "700" },
});
