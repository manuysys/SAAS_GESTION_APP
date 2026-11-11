import type { Metadata } from "next";

import { InvitationAcceptance } from "@/components/team/invitation-acceptance";

// Enlaces de invitación por token: no indexar y no filtrar el token por cabecera Referer.
export const metadata: Metadata = {
  title: "Invitación",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InvitationPage(props: PageProps<"/invitations/[token]">) {
  const { token } = await props.params;

  return <InvitationAcceptance token={token} />;
}
