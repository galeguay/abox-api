import 'dotenv/config';
import app from '../src/app.js';

// 1. Solo ejecutamos el listen si NO estamos en Vercel (Producción)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor local corriendo en: http://localhost:${PORT}`);
    });
}
console.log(
  process.env.DATABASE_URL
    ? '✅ DATABASE_URL cargada'
    : '❌ DATABASE_URL NO cargada'
)


// 2. EXPORTAR app es lo más importante para Vercel
export default app;