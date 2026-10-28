const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || "CocinaInteligente <onboarding@resend.dev>";

export function emailConfigurado() {
  return !!RESEND_API_KEY;
}

// Envío por HTTP directo a la API de Resend, sin SDK (una sola llamada no
// lo justifica). Sin RESEND_API_KEY configurada, las rutas que dependen de
// esto degradan a un 503 con mensaje claro en vez de romper.
export async function enviarEmail(destinatario: string, asunto: string, html: string) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada");
  }

  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: MAIL_FROM, to: destinatario, subject: asunto, html }),
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text();
    throw new Error(`Resend respondió con error (HTTP ${respuesta.status}): ${texto}`);
  }
}
