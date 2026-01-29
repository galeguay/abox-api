import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

// Mock para Auditoría (CRÍTICO: evita errores al llamar logAction)
const mockAuditService = {
  logAction: jest.fn(),
};

// Mock para Email (Para evitar envíos reales si se descomenta el código)
const mockEmailService = {
  sendWelcomeEmail: jest.fn(),
};

jest.unstable_mockModule('../src/platform/audit/platform.audit.service.js', () => mockAuditService);
jest.unstable_mockModule('../src/platform/email/email.service.js', () => mockEmailService);

// 3. IMPORTAR EL SERVICIO (SUT - System Under Test)
// Se importa DESPUÉS de definir los mocks
const usersService = await import('../../../src/modules/users/users.service.js');
const bcrypt = (await import('bcryptjs')).default;
const crypto = (await import('crypto')).default; // Importamos crypto real para mockear sus métodos si es necesario

describe('Users Service Logic', () => {
  const mockUserId = 'user-1';
  const mockCompanyId = 'company-1';
  const mockUserCompanyId = 'uc-1';

  const mockUser = {
    id: mockUserId,
    email: 'user@example.com',
    password: 'hashed-password',
    active: true,
    createdAt: new Date(),
  };

  const mockUserCompany = {
    id: mockUserCompanyId,
    userId: mockUserId,
    companyId: mockCompanyId,
    role: 'ADMIN',
    active: true,
    user: mockUser,
    company: { id: mockCompanyId, name: 'Test Corp', active: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Restaurar implementación por defecto de transacción
    mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  });

  // ================= MY PROFILE =================
  describe('getMyProfile', () => {
    test('obtiene perfil filtrando empresas activas', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        companies: [{ ...mockUserCompany }],
      });

      const result = await usersService.getMyProfile(mockUserId);

      expect(result.id).toBe(mockUserId);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          select: expect.objectContaining({
            companies: expect.objectContaining({ where: { active: true } }),
          }),
        })
      );
    });

    test('lanza error si el usuario no existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(usersService.getMyProfile('ghost-id')).rejects.toThrow('Usuario no encontrado');
    });
  });

  // ================= SWITCH ACTIVE COMPANY (NUEVO) =================
  describe('switchActiveCompany', () => {
    test('cambia de empresa correctamente y loguea la acción', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue(mockUserCompany);

      const result = await usersService.switchActiveCompany(mockUserId, mockCompanyId);

      expect(result.message).toBe('Empresa activa cambiada');
      // Verificar que se llamó a logAction
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE', // AUDIT_ACTIONS.UPDATE
          resource: 'ACTIVE_COMPANY', // AUDIT_RESOURCES.ACTIVE_COMPANY
          userId: mockUserId,
        })
      );
    });

    test('error si el usuario está desactivado localmente en la empresa', async () => {
      const inactiveUserCompany = { ...mockUserCompany, active: false };
      mockPrisma.userCompany.findUnique.mockResolvedValue(inactiveUserCompany);

      await expect(usersService.switchActiveCompany(mockUserId, mockCompanyId))
        .rejects.toThrow('Tu usuario está desactivado en esta compañía');
    });

    test('error si la empresa está suspendida', async () => {
        const suspendedCompanyUC = { 
            ...mockUserCompany, 
            company: { ...mockUserCompany.company, active: false } 
        };
        mockPrisma.userCompany.findUnique.mockResolvedValue(suspendedCompanyUC);
  
        await expect(usersService.switchActiveCompany(mockUserId, mockCompanyId))
          .rejects.toThrow('La compañía se encuentra suspendida');
      });
  });

  // ================= CHANGE PASSWORD =================
  describe('changeMyPassword', () => {
    test('actualiza contraseña tras verificar la actual', async () => {
      // Mock de bcrypt
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new-secure-hash');

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);

      await usersService.changeMyPassword(mockUserId, 'valid-old', 'new-pass');

      expect(bcrypt.compare).toHaveBeenCalledWith('valid-old', mockUser.password);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
          data: { password: 'new-secure-hash' },
        })
      );
      expect(mockAuditService.logAction).toHaveBeenCalled();
    });

    test('error con contraseña actual incorrecta', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);
  
        await expect(usersService.changeMyPassword(mockUserId, 'wrong', 'new'))
          .rejects.toThrow('Contraseña actual incorrecta');
      });
  });

  // ================= INVITE USER =================
  describe('inviteUserToCompany', () => {
    test('Crea usuario nuevo y asigna a empresa (Flujo completo)', async () => {
        // 1. Mock validación inicial
        mockPrisma.company.findUnique.mockResolvedValue({ id: mockCompanyId, name: 'Corp' });
        
        // 2. Mocks dentro de la transacción
        // Usuario no existe
        mockPrisma.user.findUnique.mockResolvedValue(null);
        // Crear usuario
        mockPrisma.user.create.mockResolvedValue({ ...mockUser, id: 'new-user-id' });
        // UserCompany no existe
        mockPrisma.userCompany.findUnique.mockResolvedValue(null);
        // Crear relación
        const createdRelation = { ...mockUserCompany, user: { ...mockUser, id: 'new-user-id' } };
        mockPrisma.userCompany.create.mockResolvedValue(createdRelation);

        // Spy de crypto para token
        jest.spyOn(crypto, 'randomBytes').mockImplementation(() => Buffer.from('mocked-token'));

        const res = await usersService.inviteUserToCompany(mockCompanyId, 'new@mail.com', 'EMPLOYEE', 'admin-id');

        expect(mockPrisma.$transaction).toHaveBeenCalled();
        expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ 
                email: 'new@mail.com',
                invitationToken: expect.any(String)
            })
        }));
        expect(mockPrisma.userCompany.create).toHaveBeenCalled();
        expect(mockAuditService.logAction).toHaveBeenCalledWith(expect.objectContaining({
            action: 'CREATE',
            resource: 'COMPANY_USER'
        }));
    });

    test('Agrega usuario existente a la empresa', async () => {
        mockPrisma.company.findUnique.mockResolvedValue({ id: mockCompanyId });
        
        // Usuario YA existe
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        // Relación NO existe
        mockPrisma.userCompany.findUnique.mockResolvedValue(null);
        // Crear relación
        mockPrisma.userCompany.create.mockResolvedValue({ ...mockUserCompany, role: 'MANAGER' });

        await usersService.inviteUserToCompany(mockCompanyId, mockUser.email, 'MANAGER', 'admin-id');

        // NO debe crear usuario
        expect(mockPrisma.user.create).not.toHaveBeenCalled();
        // SÍ debe crear relación
        expect(mockPrisma.userCompany.create).toHaveBeenCalled();
    });

    test('Error si el usuario ya está en la empresa', async () => {
        mockPrisma.company.findUnique.mockResolvedValue({ id: mockCompanyId });
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        // Relación YA existe
        mockPrisma.userCompany.findUnique.mockResolvedValue(mockUserCompany);

        await expect(usersService.inviteUserToCompany(mockCompanyId, mockUser.email, 'MANAGER', 'admin-id'))
            .rejects.toThrow('El usuario ya existe en esta compañía');
    });
  });

  // ================= COMPLETE INVITATION (NUEVO) =================
  describe('completeInvitation', () => {
      test('Configura password con token válido', async () => {
          const validDate = new Date();
          validDate.setHours(validDate.getHours() + 24); // Expira mañana

          const invitedUser = { 
              ...mockUser, 
              invitationToken: 'valid-token', 
              invitationExpires: validDate 
          };

          mockPrisma.user.findUnique.mockResolvedValue(invitedUser);
          jest.spyOn(bcrypt, 'hash').mockResolvedValue('final-hash');

          await usersService.completeInvitation('valid-token', 'password123');

          expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
              where: { id: invitedUser.id },
              data: expect.objectContaining({
                  password: 'final-hash',
                  invitationToken: null,
                  active: true
              })
          }));
      });

      test('Falla con token expirado', async () => {
        const expiredDate = new Date();
        expiredDate.setHours(expiredDate.getHours() - 24); // Expiró ayer

        const expiredUser = { 
            ...mockUser, 
            invitationToken: 'old-token', 
            invitationExpires: expiredDate 
        };

        mockPrisma.user.findUnique.mockResolvedValue(expiredUser);

        await expect(usersService.completeInvitation('old-token', 'pass'))
            .rejects.toThrow('El enlace de invitación ha caducado');
      });
  });

  // ================= GESTIÓN USUARIOS EMPRESA =================
  describe('deactivateUserInCompany', () => {
    test('Desactiva localmente y audita', async () => {
      mockPrisma.userCompany.findUnique.mockResolvedValue(mockUserCompany);
      mockPrisma.userCompany.update.mockResolvedValue({ ...mockUserCompany, active: false });

      await usersService.deactivateUserInCompany(mockCompanyId, mockUserId, 'admin-id');

      expect(mockPrisma.userCompany.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserCompanyId },
          data: { active: false },
        })
      );
      expect(mockAuditService.logAction).toHaveBeenCalledWith(expect.objectContaining({
          resource: 'COMPANY_USER_DEACTIVATE'
      }));
    });
  });

  describe('getCompanyUsers', () => {
      test('Lista usuarios con búsqueda y paginación', async () => {
          mockPrisma.userCompany.findMany.mockResolvedValue([mockUserCompany]);
          mockPrisma.userCompany.count.mockResolvedValue(1);

          const result = await usersService.getCompanyUsers(mockCompanyId, 1, 10, { search: 'Test' });

          expect(result.data).toHaveLength(1);
          expect(mockPrisma.userCompany.findMany).toHaveBeenCalledWith(expect.objectContaining({
              where: expect.objectContaining({
                  user: expect.objectContaining({
                      OR: expect.any(Array)
                  })
              })
          }));
      });
  });
});