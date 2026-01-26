import 'dotenv/config';
import app from './app.js';


if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no definida');
}

// 1. Solo ejecutamos el listen si NO estamos en Vercel (Producción)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor local corriendo en: http://localhost:${PORT}`);
    });
}

// 2. EXPORTAR app es lo más importante para Vercel
export default app;