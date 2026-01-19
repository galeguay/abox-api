import prisma from '../prisma/client.js';
import { ALL_PERMISSIONS } from '../config/permissions.js';
import bcrypt from 'bcryptjs';

async function main() {
  // Crear módulos primero
  const modules = [
    { code: 'STOCK', name: 'Stock' },
    { code: 'WAREHOUSES', name: 'Depósitos' },
    { code: 'SALES', name: 'Ventas' },
    { code: 'CASH', name: 'Caja' },
    { code: 'PURCHASES', name: 'Compras' },
    { code: 'CUSTOMERS', name: 'Clientes' },
    { code: 'ORDERS', name: 'Pedidos' },
    { code: 'MONEY', name: 'Dinero' },
    { code: 'PROMOTIONS', name: 'Promociones' },
    { code: 'REPORTS', name: 'Reportes' },
    { code: 'USERS', name: 'Usuarios' },
  ];

  for (const module of modules) {
    await prisma.module.upsert({
      where: { code: module.code },
      update: {},
      create: module,
    });
  }
  console.log('✅ Módulos creados');

  // Obtener el módulo por defecto para asignar permisos
  const defaultModule = await prisma.module.findFirst({
    where: { code: 'PRODUCTS' }
  });

  if (defaultModule) {
    await prisma.permission.createMany({
      data: ALL_PERMISSIONS.map(name => ({ 
        name,
        moduleId: defaultModule.id
      })),
      skipDuplicates: true
    });
    console.log('✅ Permisos creados');
  }

  const platformEmail = 'admin@platform.com';

  const exists = await prisma.user.findUnique({
    where: { email: platformEmail }
  });

  if (!exists) {
    const passwordHash = await bcrypt.hash('admin123', 10);

    await prisma.user.create({
      data: {
        email: platformEmail,
        password: passwordHash,
        type: 'PLATFORM',
        active: true
      }
    });

    console.log('✅ Usuario de plataforma creado');
  } else {
    console.log('ℹ Usuario de plataforma ya existe');
  }

  console.log('✅ Seed ejecutado correctamente');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
