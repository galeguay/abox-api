import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

const productsService = await import('../../../src/modules/products/products.service.js');

describe('Products Service', () => {
    const mockCompanyId = 'company-1';

    // 2. Factory: Crea un objeto limpio y nuevo para cada llamada
    const createMockProduct = (overrides = {}) => ({
        id: 'product-1',
        name: 'Test Product',
        sku: 'SKU-001',
        companyId: mockCompanyId,
        active: true,
        _count: { stocks: 5 },
        ...overrides
    });

    describe('createProduct', () => {
        test('crea producto correctamente', async () => {
            mockPrisma.product.findFirst.mockResolvedValue(null);
            // Usamos la factory
            mockPrisma.product.create.mockResolvedValue(createMockProduct());

            const result = await productsService.createProduct(mockCompanyId, {
                name: 'Test Product',
                sku: 'SKU-001'
            });

            expect(result.name).toBe('Test Product');
            // Verificamos transacción del mock centralizado
            expect(mockPrisma.$transaction).toHaveBeenCalled();
        });
    });

    describe('deleteProduct', () => {
        test('soft delete activo', async () => {
            // Aquí pedimos un producto que ya tenga historial (simulado)
            mockPrisma.product.findFirst.mockResolvedValue(createMockProduct());
            mockPrisma.saleItem.findFirst.mockResolvedValue({ id: 'sale-1' });

            await productsService.deleteProduct(mockCompanyId, 'product-1');

            expect(mockPrisma.product.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ active: false }) })
            );
        });
    });
});