import prisma from '../src/prisma/client.js';
import { PERMISSIONS } from '../src/config/permissions.js';

async function main() {
  await prisma.permission.createMany({
    data: PERMISSIONS.map(name => ({ name })),
    skipDuplicates: true
  });
}

main()
  .then(() => console.log('Permisos cargados'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
