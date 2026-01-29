import nodemailer from 'nodemailer';

// Configuración del transporte (En producción, usa variables de entorno)
// Si aún no tienes SMTP, esto fallará, pero la estructura ya queda lista.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.SMTP_USER || 'user',
        pass: process.env.SMTP_PASS || 'pass',
    },
});

/**
 * Envía la invitación y credenciales temporales a un nuevo usuario
 * @param {string} email - Correo del destinatario
 * @param {string} password - Contraseña temporal (solo se envía una vez)
 * @param {string} companyName - Nombre de la empresa que invita
 */
export const sendWelcomeEmail = async (email, password, companyName) => {
    try {
        const info = await transporter.sendMail({
            from: '"SaaS Platform" <no-reply@tuapp.com>',
            to: email,
            subject: `Bienvenido a ${companyName} - Tus credenciales`,
            html: `
        <h3>Has sido invitado a unirte a ${companyName}</h3>
        <p>Se ha creado una cuenta para ti. Aquí están tus credenciales temporales:</p>
        <ul>
          <li><strong>Usuario:</strong> ${email}</li>
          <li><strong>Contraseña temporal:</strong> ${password}</li>
        </ul>
        <p>Por favor, inicia sesión y cambia tu contraseña inmediatamente.</p>
      `,
        });

        console.log(`[EMAIL] Correo de bienvenida enviado a: ${email} (ID: ${info.messageId})`);
        return true;
    } catch (error) {
        // IMPORTANTE: Aquí logueamos el error de envío, pero NUNCA la contraseña
        console.error(`[EMAIL ERROR] No se pudo enviar correo a ${email}:`, error.message);
        // En producción, podrías querer encolar este email para reintentarlo
        return false;
    }
};