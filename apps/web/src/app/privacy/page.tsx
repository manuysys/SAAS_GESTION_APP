import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { brand } from "@/lib/brand";
import { siteUrl } from "@/lib/marketing/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Política de privacidad",
  description: `Cómo ${brand.name} trata los datos personales de usuarios, empresas y clientes finales.`,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

const sections: readonly LegalSection[] = [
  {
    title: "1. Responsable",
    paragraphs: [
      `${brand.name} es un producto de ${brand.legalName}. La razón social responsable del tratamiento está pendiente de definición. Contacto: ${brand.email}.`,
    ],
  },
  {
    title: "2. Qué datos tratamos",
    paragraphs: [
      "Datos de cuenta: nombre, email y contraseña. La contraseña se guarda con hash Argon2id; nunca en texto plano.",
      "Datos de la empresa usuaria: razón social, datos de contacto y configuración de planes.",
      "Datos de clientes finales que cada empresa carga: nombre, teléfono, dirección, equipos, solicitudes, presupuestos, órdenes de trabajo, pagos y fotos de trabajos.",
      "Registros técnicos y de auditoría: accesos, cambios de estado y acciones relevantes, con actor y fecha.",
    ],
  },
  {
    title: "3. Para qué los usamos",
    paragraphs: [
      "Prestar el servicio, autenticar usuarios, enviar notificaciones internas, dar soporte, prevenir abusos y registrar auditoría.",
      "No vendemos datos personales ni los usamos para publicidad de terceros.",
    ],
  },
  {
    title: "4. Rol frente a los datos de clientes finales",
    paragraphs: [
      "Respecto de los datos de clientes finales que cada empresa carga, la empresa es responsable del tratamiento y tiene la base legal para ello. El servicio actúa como encargado del tratamiento, procesando esos datos solo para prestar la plataforma.",
    ],
  },
  {
    title: "5. Cookies",
    paragraphs: [
      "Usamos cookies esenciales para mantener la sesión (autenticación con cookies HttpOnly y renovación de sesión). No usamos cookies de publicidad.",
      "Si se incorporan herramientas de analítica o de terceros, esta política se actualizará y se pedirá consentimiento cuando corresponda.",
    ],
  },
  {
    title: "6. Proveedores y ubicación de los datos",
    paragraphs: [
      "Usamos proveedores de infraestructura para alojar la aplicación y la base de datos. La región de alojamiento está pendiente de confirmación definitiva.",
      "Si se activan integraciones como WhatsApp Cloud API de Meta o un proveedor externo de IA, los datos necesarios se envían a esos proveedores solo para la función habilitada por la empresa.",
    ],
  },
  {
    title: "7. Conservación",
    paragraphs: [
      "Conservamos los datos mientras la cuenta esté activa. Al cerrarla, los datos se eliminan o anonimizan, salvo que exista una obligación legal de conservarlos. Los plazos de copias de seguridad se definirán antes del lanzamiento.",
    ],
  },
  {
    title: "8. Tus derechos",
    paragraphs: [
      `Conforme a la Ley 25.326 de Protección de los Datos Personales, podés solicitar acceso, rectificación, actualización o supresión de tus datos escribiendo a ${brand.email}.`,
      "El órgano de control es la Agencia de Acceso a la Información Pública (AAIP).",
    ],
  },
  {
    title: "9. Seguridad",
    paragraphs: [
      "Aplicamos medidas técnicas y organizativas: contraseñas con hash, tokens de acceso de corta duración, validación de permisos por empresa en el backend, límites de intentos en el acceso y cabeceras de seguridad HTTP.",
    ],
  },
  {
    title: "10. Cambios en esta política",
    paragraphs: [
      "Podemos actualizar esta política. Los cambios sustanciales se comunicarán a los usuarios de la plataforma.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      updatedAt="9 de noviembre de 2026"
      sections={sections}
    />
  );
}
