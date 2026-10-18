import 'server-only';
import nodemailer from 'nodemailer';

// Envoi de courriels par la boîte officielle (Namecheap Private Email). Les
// identifiants viennent de l'environnement : SMTP_HOST (mail.privateemail.com),
// SMTP_PORT (465), SMTP_USER (contact@contest-taxes.ca), SMTP_PASS, et
// facultativement SMTP_FROM. Sans eux, rien n'est envoyé et l'appelant le sait.

export function courrielConfigure(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function envoyerCourriel(opts: {
  a: string;
  sujet: string;
  texte: string;
  repondreA?: string;
}): Promise<{ envoye: boolean; motif?: string }> {
  if (!courrielConfigure()) return { envoye: false, motif: 'SMTP non configuré' };
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: opts.a,
    subject: opts.sujet,
    text: opts.texte,
    replyTo: opts.repondreA,
  });
  return { envoye: true };
}
