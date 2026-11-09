import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { brand } from "@/lib/brand";
import { siteUrl } from "@/lib/marketing/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Términos y condiciones",
  description: `Condiciones de uso de ${brand.name} para empresas de servicios técnicos.`,
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

const sections: readonly LegalSection[] = [
  {
    title: "1. Objeto",
    paragraphs: [
      `${brand.name} es una plataforma de gestión para empresas de servicios técnicos: clientes, solicitudes, órdenes de trabajo, presupuestos, agenda, pagos y herramientas de comunicación.`,
    ],
  },
  {
    title: "2. Cuenta y uso aceptable",
    paragraphs: [
      "La persona que crea una cuenta es responsable de custodiar sus credenciales y de los actos realizados con ellas.",
      "El usuario se compromete a cargar información veraz, a usar la plataforma para fines lícitos y a no intentar acceder a datos de otras empresas.",
    ],
  },
  {
    title: "3. Planes, precios y prueba",
    paragraphs: [
      "Los precios se expresan en pesos argentinos (ARS) por mes y son de lanzamiento. Pueden modificarse con aviso previo para los períodos siguientes.",
      "La prueba gratuita de 14 días está en implementación. Hoy el registro crea una suscripción en prueba y no se realiza ningún cobro. Los medios de pago y la facturación se informarán antes de cualquier cobro.",
    ],
  },
  {
    title: "4. Disponibilidad del servicio",
    paragraphs: [
      "La plataforma se ofrece en etapa de lanzamiento. No se garantiza un nivel de disponibilidad determinado (SLA) y pueden existir interrupciones programadas o no programadas.",
    ],
  },
  {
    title: "5. Datos de clientes finales",
    paragraphs: [
      "La empresa usuaria es responsable de la información que carga sobre sus clientes y de contar con la base legal para tratarla. La relación de tratamiento se describe en la política de privacidad.",
    ],
  },
  {
    title: "6. Integraciones de terceros",
    paragraphs: [
      "Las integraciones con servicios de terceros, como WhatsApp Cloud API de Meta o proveedores de inteligencia artificial, se rigen también por sus propias condiciones. Requieren credenciales que la empresa debe obtener y administrar.",
    ],
  },
  {
    title: "7. Propiedad intelectual",
    paragraphs: [
      "La plataforma, su código, diseño y marca pertenecen a sus titulares. Los datos cargados por cada empresa siguen siendo de esa empresa.",
    ],
  },
  {
    title: "8. Limitación de responsabilidad",
    paragraphs: [
      "En la medida permitida por la normativa aplicable, la responsabilidad del servicio se limita a los daños directos comprobables. La plataforma no reemplaza el asesoramiento fiscal, contable ni legal de cada empresa.",
    ],
  },
  {
    title: "9. Suspensión y terminación",
    paragraphs: [
      "Podemos suspender cuentas que incumplan estas condiciones o que pongan en riesgo la seguridad del servicio. La empresa puede cerrar su cuenta en cualquier momento solicitándolo por contacto.",
    ],
  },
  {
    title: "10. Ley aplicable y jurisdicción",
    paragraphs: [
      "Estas condiciones se rigen por las leyes de la República Argentina. La jurisdicción aplicable está pendiente de definición por asesor legal.",
    ],
  },
  {
    title: "11. Contacto",
    paragraphs: [`Consultas: ${brand.email}.`],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      updatedAt="9 de noviembre de 2026"
      sections={sections}
    />
  );
}
