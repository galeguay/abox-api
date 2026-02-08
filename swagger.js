// swagger.js
import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Mi API de Inventario',
    description: 'API gestionada con Node.js y Prisma',
  },
  host: 'localhost:3000', // O tu dominio en producción
  schemes: ['http'],
};

const outputFile = './swagger-output.json';
const routes = ['./src/app.js'];

/* NOTA: Si usas varias archivos de rutas y no un index central, 
   puedes ponerlos en un array: ['./src/routes/products.js', './src/routes/users.js'] 
*/

swaggerAutogen()(outputFile, routes, doc);