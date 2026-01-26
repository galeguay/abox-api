import { jest } from '@jest/globals';

/**
 * Mock completo del cliente de Prisma para pruebas unitarias.
 */
export const mockPrisma = {
    // --- Modelos Base ---
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    company: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    userCompany: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },

    // --- Productos y Almacenes ---
    product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    productCost: {
        create: jest.fn(),
        findFirst: jest.fn(),
    },
    warehouse: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(), // Es bueno tenerlo por si acaso implementas soft delete luego
    },
    stock: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
    },
    stockMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
    order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    orderItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
    },
    orderPayment: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
    deliveryZone: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },

    // --- Otros ---
    refreshToken: {
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    sale: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
    },
    saleItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    salePayment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    moneyMovement: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
    },
    moneyCategory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
    },
    module: {
        findMany: jest.fn(),
    },
    companyModule: {
        findMany: jest.fn(),
        upsert: jest.fn(),
    },
    purchaseItem: {
        findFirst: jest.fn(),
    },
    saleCategory: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        // delete: jest.fn(), // No lo usas en el servicio (usas soft delete con update), pero puedes agregarlo si quieres prevenir errores futuros.
    },
    productCategory: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },

    // --- Transaction Mock ---
    // Pasa el mismo mockPrisma como "tx" para que las llamadas dentro de la transacción funcionen
    $transaction: jest.fn((callback) => callback(mockPrisma)),
};

export default mockPrisma;