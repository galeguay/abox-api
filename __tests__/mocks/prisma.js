import { jest } from '@jest/globals';

/**
 * Mock completo del cliente de Prisma sincronizado con schema.prisma
 */
export const mockPrisma = {
    // --- Modelos Base y Usuarios ---
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
    permission: { // NUEVO
        findMany: jest.fn(),
        create: jest.fn(),
    },
    rolePermission: { // NUEVO
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    refreshToken: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
    },

    // --- Productos y Catálogo ---
    product: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
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
    productPrice: { // NUEVO
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
    productCost: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
    productComponent: { // NUEVO
        create: jest.fn(),
        deleteMany: jest.fn(),
    },

    // --- Almacenes y Stock ---
    warehouse: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    stock: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        groupBy: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
    },
    stockMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },

    // --- Ventas y Pedidos ---
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
    saleCategory: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    customer: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
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
        deleteMany: jest.fn(),
    },
    orderPayment: {
        create: jest.fn(),
        findMany: jest.fn(),
    },
    deliveryZone: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },

    // --- Compras y Proveedores ---
    supplier: { // NUEVO
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    },
    purchase: { // NUEVO
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
    },
    purchaseItem: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
    },
    purchasePayment: { // NUEVO
        create: jest.fn(),
        findMany: jest.fn(),
    },

    // --- Caja y Finanzas ---
    cashSession: { // NUEVO
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    cashDenomination: { // NUEVO
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    moneyMovement: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
        count: jest.fn(),
    },
    moneyCategory: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },

    // --- Modificadores y Promociones ---
    modifierGroup: { // NUEVO
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    modifier: { // NUEVO
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    productModifierGroup: { // NUEVO
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    saleItemModifier: { // NUEVO
        create: jest.fn(),
    },
    promotion: { // NUEVO
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    promotionItem: { // NUEVO
        create: jest.fn(),
        deleteMany: jest.fn(),
    },

    // --- Configuración y Módulos ---
    module: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
    },
    companyModule: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
    },

    // --- Tablas de Analíticas (Reportes) ---
    // Importante tenerlas si tienes CRON jobs o dashboards
    salesDaily: { // NUEVO
        upsert: jest.fn(),
        findMany: jest.fn(),
    },
    salesByProduct: { // NUEVO
        upsert: jest.fn(),
        findMany: jest.fn(),
    },
    profitByProduct: { // NUEVO
        upsert: jest.fn(),
        findMany: jest.fn(),
    },
    cashDaily: { // NUEVO
        upsert: jest.fn(),
        findMany: jest.fn(),
    },
    productNoRotation: { // NUEVO
        upsert: jest.fn(),
        findMany: jest.fn(),
    },
    salesByCategory: { // NUEVO
        upsert: jest.fn(),
        findMany: jest.fn(),
    },
    salesBySaleCategory: { // NUEVO
        upsert: jest.fn(),
        findMany: jest.fn(),
    },

    // --- Transaction Mock Mejorado ---
    // Soporta:
    // 1. prisma.$transaction([op1, op2]) -> Array de Promesas
    // 2. prisma.$transaction(async (tx) => { ... }) -> Callback interactivo
    $transaction: jest.fn((arg) => {
        if (Array.isArray(arg)) {
            // Si es un array de promesas, las resuelve todas
            return Promise.all(arg);
        }
        if (typeof arg === 'function') {
            // Si es una función (interactive transaction), la ejecuta pasando el mock
            return arg(mockPrisma);
        }
        return Promise.resolve(arg);
    }),
};

export default mockPrisma;