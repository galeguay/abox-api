import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

// Import dinámico del servicio a testear
const categoriesService = await import('../../../src/modules/sales-categories/sales-categories.service.js');

describe('Sales Categories Service', () => {
    const mockCompanyId = 'company-1';

    // Helper para crear categorías mock
    const createMockCategory = (overrides = {}) => ({
        id: 'cat-1',
        companyId: mockCompanyId,
        name: 'General',
        color: '#ffffff',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createCategory', () => {
        const inputData = { name: 'Electrónica', color: '#000000' };

        test('crea una categoría exitosamente si no existe duplicado', async () => {
            // Mock: No existe categoría previa con ese nombre
            mockPrisma.saleCategory.findUnique.mockResolvedValue(null);
            
            // Mock: Respuesta de la creación
            const newCategory = createMockCategory({ ...inputData });
            mockPrisma.saleCategory.create.mockResolvedValue(newCategory);

            const result = await categoriesService.createCategory(mockCompanyId, inputData);

            // Verificaciones
            expect(mockPrisma.saleCategory.findUnique).toHaveBeenCalledWith({
                where: {
                    companyId_name: {
                        companyId: mockCompanyId,
                        name: inputData.name
                    }
                }
            });
            expect(mockPrisma.saleCategory.create).toHaveBeenCalledWith({
                data: {
                    companyId: mockCompanyId,
                    name: inputData.name,
                    color: inputData.color,
                    active: true
                }
            });
            expect(result).toEqual(newCategory);
        });

        test('falla si ya existe una categoría con ese nombre', async () => {
            // Mock: Ya existe
            mockPrisma.saleCategory.findUnique.mockResolvedValue(createMockCategory({ name: 'Electrónica' }));

            await expect(categoriesService.createCategory(mockCompanyId, inputData))
                .rejects.toThrow('Ya existe una categoría con ese nombre en tu empresa');

            // Asegurar que no se llamó a create
            expect(mockPrisma.saleCategory.create).not.toHaveBeenCalled();
        });
    });

    describe('getCategories', () => {
        test('lista solo categorías activas por defecto', async () => {
            mockPrisma.saleCategory.findMany.mockResolvedValue([createMockCategory()]);

            await categoriesService.getCategories(mockCompanyId);

            expect(mockPrisma.saleCategory.findMany).toHaveBeenCalledWith({
                where: { companyId: mockCompanyId, active: true },
                orderBy: { name: 'asc' }
            });
        });

        test('lista todas (incluyendo inactivas) si se solicita', async () => {
            mockPrisma.saleCategory.findMany.mockResolvedValue([createMockCategory()]);

            await categoriesService.getCategories(mockCompanyId, true);

            // Verifica que 'active: true' NO esté en el where
            expect(mockPrisma.saleCategory.findMany).toHaveBeenCalledWith({
                where: { companyId: mockCompanyId },
                orderBy: { name: 'asc' }
            });
        });
    });

    describe('getCategoryById', () => {
        test('retorna la categoría si existe', async () => {
            const mockCat = createMockCategory({ id: 'cat-1' });
            mockPrisma.saleCategory.findFirst.mockResolvedValue(mockCat);

            const result = await categoriesService.getCategoryById(mockCompanyId, 'cat-1');
            expect(result).toEqual(mockCat);
        });

        test('lanza error 404 si no existe', async () => {
            mockPrisma.saleCategory.findFirst.mockResolvedValue(null);

            await expect(categoriesService.getCategoryById(mockCompanyId, 'cat-999'))
                .rejects.toThrow('Categoría no encontrada');
        });
    });

    describe('updateCategory', () => {
        const catId = 'cat-1';
        const existingCategory = createMockCategory({ id: catId, name: 'Original' });

        test('actualiza datos simples sin conflicto de nombre', async () => {
            // 1. Mock de getCategoryById (existencia)
            mockPrisma.saleCategory.findFirst.mockResolvedValue(existingCategory);
            // 2. Mock del update
            mockPrisma.saleCategory.update.mockResolvedValue({ ...existingCategory, color: '#ff0000' });

            await categoriesService.updateCategory(mockCompanyId, catId, { color: '#ff0000' });

            expect(mockPrisma.saleCategory.update).toHaveBeenCalledWith({
                where: { id: catId },
                data: { name: undefined, color: '#ff0000', active: undefined }
            });
        });

        test('falla si al cambiar nombre este ya existe en otra categoría', async () => {
            // 1. Mock existencia actual
            mockPrisma.saleCategory.findFirst.mockResolvedValue(existingCategory);
            
            // 2. Mock validación de duplicado (simulamos que encuentra otra con ese nombre)
            mockPrisma.saleCategory.findUnique.mockResolvedValue({ id: 'cat-2', name: 'NuevoNombre' });

            await expect(categoriesService.updateCategory(mockCompanyId, catId, { name: 'NuevoNombre' }))
                .rejects.toThrow('Ya existe otra categoría con este nombre');

            expect(mockPrisma.saleCategory.update).not.toHaveBeenCalled();
        });
    });

    describe('deleteCategory', () => {
        test('realiza soft delete desactivando la categoría', async () => {
            const catId = 'cat-1';
            // Mock existencia
            mockPrisma.saleCategory.findFirst.mockResolvedValue(createMockCategory({ id: catId }));
            // Mock update
            mockPrisma.saleCategory.update.mockResolvedValue({ id: catId, active: false });

            await categoriesService.deleteCategory(mockCompanyId, catId);

            expect(mockPrisma.saleCategory.update).toHaveBeenCalledWith({
                where: { id: catId },
                data: { active: false }
            });
        });
    });
});