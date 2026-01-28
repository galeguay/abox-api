import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

// Importamos el servicio dinámicamente
import * as categoriesService from '../../../src/modules/product-categories/product-categories.service.js';

describe('Product Categories Service', () => {
    const mockCompanyId = 'company-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createCategory', () => {
        const inputData = { name: 'Bebidas' };

        test('crea una categoría exitosamente si el nombre es único', async () => {
            // 1. Mock: No existe categoría con ese nombre
            mockPrisma.productCategory.findUnique.mockResolvedValue(null);
            
            // 2. Mock: Creación exitosa
            mockPrisma.productCategory.create.mockResolvedValue({
                id: 'cat-1',
                companyId: mockCompanyId,
                name: 'Bebidas'
            });

            const result = await categoriesService.createCategory(mockCompanyId, inputData);

            expect(mockPrisma.productCategory.findUnique).toHaveBeenCalledWith({
                where: {
                    companyId_name: {
                        companyId: mockCompanyId,
                        name: inputData.name
                    }
                }
            });

            expect(mockPrisma.productCategory.create).toHaveBeenCalledWith({
                data: {
                    name: inputData.name,
                    companyId: mockCompanyId
                }
            });
            expect(result.id).toBe('cat-1');
        });

        test('falla si ya existe una categoría con ese nombre', async () => {
            // 1. Mock: Ya existe categoría
            mockPrisma.productCategory.findUnique.mockResolvedValue({ id: 'cat-existing' });

            await expect(categoriesService.createCategory(mockCompanyId, inputData))
                .rejects.toThrow('Ya existe una categoría con este nombre');

            expect(mockPrisma.productCategory.create).not.toHaveBeenCalled();
        });
    });

    describe('getCategories', () => {
        test('lista categorías con paginación y filtros', async () => {
            const filters = { page: 1, limit: 10, search: 'Beb' };
            
            mockPrisma.productCategory.findMany.mockResolvedValue([
                { id: 'cat-1', name: 'Bebidas' }
            ]);
            mockPrisma.productCategory.count.mockResolvedValue(1);

            const result = await categoriesService.getCategories(mockCompanyId, filters);

            expect(mockPrisma.productCategory.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        companyId: mockCompanyId,
                        name: { contains: 'Beb', mode: 'insensitive' }
                    }),
                    take: 10,
                    skip: 0
                })
            );

            expect(result.data).toHaveLength(1);
            expect(result.pagination.total).toBe(1);
        });
    });

    describe('updateCategory', () => {
        const categoryId = 'cat-1';
        
        test('actualiza el nombre si es único', async () => {
            // 1. Mock: La categoría existe
            mockPrisma.productCategory.findFirst.mockResolvedValue({ 
                id: categoryId, 
                name: 'Old Name' 
            });

            // 2. Mock: El nuevo nombre NO existe en otra categoría
            mockPrisma.productCategory.findUnique.mockResolvedValue(null);

            // 3. Mock: Update
            mockPrisma.productCategory.update.mockResolvedValue({ 
                id: categoryId, 
                name: 'New Name' 
            });

            const result = await categoriesService.updateCategory(mockCompanyId, categoryId, { name: 'New Name' });

            expect(result.name).toBe('New Name');
            expect(mockPrisma.productCategory.update).toHaveBeenCalled();
        });

        test('falla si intenta actualizar a un nombre que ya existe', async () => {
            // 1. Existe la categoría actual
            mockPrisma.productCategory.findFirst.mockResolvedValue({ 
                id: categoryId, 
                name: 'Old Name' 
            });

            // 2. Ya existe OTRA categoría con el nombre destino
            mockPrisma.productCategory.findUnique.mockResolvedValue({ id: 'cat-other' });

            await expect(categoriesService.updateCategory(mockCompanyId, categoryId, { name: 'Existing Name' }))
                .rejects.toThrow('Ya existe una categoría con este nombre');

            expect(mockPrisma.productCategory.update).not.toHaveBeenCalled();
        });
    });

    describe('deleteCategory', () => {
        const categoryId = 'cat-1';

        test('elimina la categoría si NO tiene productos asociados', async () => {
            // 1. Mock: Categoría existe
            mockPrisma.productCategory.findFirst.mockResolvedValue({ id: categoryId });
            
            // 2. Mock: Conteo de productos es 0
            mockPrisma.product.count.mockResolvedValue(0);

            // 3. Mock: Delete
            mockPrisma.productCategory.delete.mockResolvedValue({ id: categoryId });

            const result = await categoriesService.deleteCategory(mockCompanyId, categoryId);

            expect(result.message).toContain('correctamente');
            expect(mockPrisma.productCategory.delete).toHaveBeenCalledWith({
                where: { id: categoryId }
            });
        });

        test('impide eliminación si tiene productos asociados', async () => {
            // 1. Categoría existe
            mockPrisma.productCategory.findFirst.mockResolvedValue({ id: categoryId });
            
            // 2. Tiene productos asociados (ej. 5 productos)
            mockPrisma.product.count.mockResolvedValue(5);

            await expect(categoriesService.deleteCategory(mockCompanyId, categoryId))
                .rejects.toThrow(/tiene 5 productos asociados/);

            expect(mockPrisma.productCategory.delete).not.toHaveBeenCalled();
        });

        test('falla si la categoría no existe', async () => {
            mockPrisma.productCategory.findFirst.mockResolvedValue(null);

            await expect(categoriesService.deleteCategory(mockCompanyId, 'cat-ghost'))
                .rejects.toThrow('Categoría no encontrada');
        });
    });
});