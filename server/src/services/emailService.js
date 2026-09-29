const nodemailer = require('nodemailer');

// Envio de e-mail por SMTP — funciona com o e-mail da empresa (Office 365, Google
// Workspace...), Gmail com senha de app ou serviços como SendGrid/Resend/Mailtrap.
// Configuração no .env (ver .env.example).
//
// Sem SMTP_HOST (desenvolvimento), o e-mail NÃO é enviado: o conteúdo aparece no
// terminal da API, pra dar pra testar os fluxos sem servidor de e-mail.
const smtpConfigurado = Boolean(process.env.SMTP_HOST);

const transporter = smtpConfigurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      // Porta 465 usa SSL direto; as outras (587, 25) começam sem e sobem pra TLS (STARTTLS)
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : null;

/**
 * Envia um e-mail (ou mostra no terminal, se o SMTP não estiver configurado).
 * @param {{ para: string, assunto: string, texto: string, html?: string }} email
 */
async function enviarEmail({ para, assunto, texto, html }) {
  if (!transporter) {
    console.log(
      '\n[E-MAIL SIMULADO — configure SMTP_HOST no .env pra enviar de verdade]\n' +
        `Para: ${para}\nAssunto: ${assunto}\n\n${texto}\n`
    );
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    subject: assunto,
    text: texto,
    html,
  });
}

module.exports = { enviarEmail };
