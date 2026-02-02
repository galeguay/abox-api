import prisma from '../prisma/client.js';
import { ALL_PERMISSIONS } from '../config/permissions.js';
import bcrypt from 'bcryptjs';

async function main() {
    // 1. Definir los módulos con sus respectivos prefijos de permisos
    const modulesConfig = [
        { code: 'STOCK', name: 'Gestión de Inventario', prefix: ['PRODUCT_', 'STOCK_', 'WAREHOUSE_'] },
        { code: 'SALES', name: 'Ventas y POS', prefix: ['SALE_', 'PAYMENT_', 'CASH_'] },
        { code: 'PURCHASES', name: 'Compras y Proveedores', prefix: ['SUPPLIER_', 'PURCHASE_'] },
        { code: 'CUSTOMERS', name: 'Clientes', prefix: ['CUSTOMER_'] },
        { code: 'DELIVERY', name: 'Pedidos y Delivery', prefix: ['ORDER_', 'DELIVERY_'] },
        { code: 'FINANCE', name: 'Contabilidad', prefix: ['MONEY_'] },
        { code: 'REPORTS', name: 'Reportes e Indicadores', prefix: ['REPORT_'] },
        { code: 'ADMIN', name: 'Configuración y Seguridad', prefix: ['USER_', 'PERMISSION_', 'COMPANY_'] },
    ];

    for (const item of modulesConfig) {
        // Crear o actualizar el módulo
        const module = await prisma.module.upsert({
            where: { code: item.code },
            update: { name: item.name },
            create: { code: item.code, name: item.name },
        });

        // Filtrar permisos que pertenecen a este módulo según el prefijo
        const modulePermissions = ALL_PERMISSIONS.filter(perm =>
            item.prefix.some(p => perm.startsWith(p))
        );

        // Crear los permisos vinculados a este módulo
        await prisma.permission.createMany({
            data: modulePermissions.map(name => ({
                name,
                moduleId: module.id
            })),
            skipDuplicates: true
        });

        console.log(`✅ Módulo ${item.code} y sus ${modulePermissions.length} permisos creados.`);
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
