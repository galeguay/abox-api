import 'dotenv/config';
import app from '../src/app.js'; // Asegúrate que esta ruta apunte correctamente a tu src/app.js

const PORT = process.env.PORT || 3001;

console.log(
  process.env.DATABASE_URL
    ? '✅ DATABASE_URL detectada'
    : '❌ DATABASE_URL NO definida'
);

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📄 Documentación en: http://localhost:${PORT}/api-docs`);
});

// Exportamos app para compatibilidad con Vercel (Serverless)
export default app;