import { describe, test, expect, afterEach, afterAll, jest, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';

// Asumimos que usas un setup que permite top-level await, si no, mueve esto dentro del describe
const { default: mockPrisma } = await import('../../../prisma/client.js');
const usersService = await import('../../../src/modules/users/users.service.js');

describe('Users Service', () => {
  const mockUserId = 'user-1';
  const mockCompanyId = 'company-1';
  const mockUserCompanyId = 'uc-1';

  // Mock básico de usuario
  const mockUser = {
    id: mockUserId,
    email: 'user@example.com',
    password: 'hashed-password',
    active: true, // Global active
    createdAt: new Date(),
  };

  // Mock de la relación UserCompany
  const mockUserCompany = {
    id: mockUserCompanyId,
    userId: mockUserId,
    companyId: mockCompanyId,
    role: 'ADMIN',
    active: true, // Local active (NUEVO CAMPO)
    user: mockUser,
    company: { id: mockCompanyId, active: true }
  };

  beforeEach(() => {
    // Hack para mockear transacciones de Prisma: 
    // Hacemos que $transaction simplemente ejecute el callback que recibe pasándole el prisma mockeado
    mockPrisma.$transaction = jest.fn((callback) => callback(mockPrisma));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================= MY PROFILE =================
  describe('getMyProfile', () => {
    test('obtiene el perfil con empresas activas', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        companies: [{ ...mockUserCompany }]
      });

      const result = await usersService.getMyProfile(mockUserId);

      expect(result.id).toBe(mockUserId);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: mockUserId },
        // Verificamos que filtre empresas activas
        select: expect.objectContaining({
            companies: expect.objectContaining({
                where: { active: true } 
            })
        })
      }));
    });
  });

  // ================= CHANGE PASSWORD =================
  describe('changeMyPassword', () => {
    test('cambia la contraseña correctamente', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-hash-123');

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      // Nota: El servicio nuevo usa argumentos separados, no un objeto
      await usersService.changeMyPassword(mockUserId, 'oldPass', 'newPass');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          data: { password: 'new-hash-123' },
        })
      );
    });
  });

  // ================= GET COMPANY USERS (ANTES getUsers) =================
  describe('getCompanyUsers', () => {
    test('lista usuarios de empresa y soporta búsqueda', async () => {
      mockPrisma.userCompany.findMany.mockResolvedValue([mockUserCompany]);
      mockPrisma.userCompany.count.mockResolvedValue(1);

      // Probamos el filtro de búsqueda que agregamos
      await usersService.getCompanyUsers(mockCompanyId, 1, 10, { search: 'John' });

      expect(mockPrisma.userCompany.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: mockCompanyId,
            user: expect.objectContaining({
                OR: expect.any(Array) // Verifica que se construyó el query OR
            })
          }),
        })
      );
    });
  });

  // ================= DEACTIVATE USER (ANTES deleteUser) =================
  describe('deactivateUserInCompany', () => {
    test('Desactivación LOCAL: modifica UserCompany.active, NO User.active', async () => {
      // Setup: Existe la relación
      mockPrisma.userCompany.findUnique.mockResolvedValue(mockUserCompany);
      
      // Mock del update
      mockPrisma.userCompany.update.mockResolvedValue({
        ...mockUserCompany,
        active: false
      });

      await usersService.deactivateUserInCompany(mockCompanyId, mockUserId, 'admin-id');

      // VERIFICACIÓN CRÍTICA:
      // Debe llamar a prisma.userCompany.update, NO a prisma.user.update
      expect(mockPrisma.userCompany.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserCompanyId },
          data: { active: false }, // Debe ser false
        })
      );
      
      // Aseguramos que NO se llamó a desactivar el usuario globalmente
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ================= INVITE USER (ANTES assignUserToCompany) =================
  describe('inviteUserToCompany', () => {
    test('crea usuario nuevo si no existe y lo asigna (Transacción)', async () => {
        // 1. Mock de Company
        mockPrisma.company.findUnique.mockResolvedValue({ id: mockCompanyId });
        
        // 2. Mock dentro de la transacción
        // user.findUnique devuelve null (usuario nuevo)
        mockPrisma.user.findUnique.mockResolvedValue(null); 
        
        // user.create (simulamos creación)
        mockPrisma.user.create.mockResolvedValue(mockUser);
        
        // userCompany.findUnique (no existe relación previa)
        mockPrisma.userCompany.findUnique.mockResolvedValue(null);
        
        // userCompany.create (éxito)
        mockPrisma.userCompany.create.mockResolvedValue(mockUserCompany);

        await usersService.inviteUserToCompany(mockCompanyId, 'new@test.com', 'EMPLOYEE', 'admin-id');

        // Validamos que se llamó a la transacción
        expect(mockPrisma.$transaction).toHaveBeenCalled();
        
        // Validamos que se creó el usuario
        expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ email: 'new@test.com' })
        }));

        // Validamos que se creó la relación
        expect(mockPrisma.userCompany.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ 
                userId: mockUserId,
                companyId: mockCompanyId,
                role: 'EMPLOYEE',
                active: true
            })
        }));
    });

    test('lanza error si el rol es inválido', async () => {
        await expect(
            usersService.inviteUserToCompany(mockCompanyId, 'test@test.com', 'SUPER_GOD_MODE', 'admin-id')
        ).rejects.toThrow('Rol inválido');
    });
  });
});