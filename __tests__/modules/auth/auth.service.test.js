import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

// bcryptjs suele ser default export, jsonwebtoken mezcla named/default.
await jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

await jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(),
    verify: jest.fn(),
  },
}));

// 2. IMPORTACIONES DINÁMICAS
// Importamos el mock y el servicio AHORA, para que recojan la versión mockeada.
const { default: prisma } = await import('../../../prisma/client.js');
const { default: bcrypt } = await import('bcryptjs');
const { default: jwt } = await import('jsonwebtoken');

// Importamos todas las exportaciones del servicio como un objeto
const authService = await import('../../../src/modules/auth/auth.service.js');

describe('Auth Service (ESM)', () => {
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    active: true,
    firstName: 'Test',
    lastName: 'User',
  };

  const mockCompanyId = 'company-1';
  const mockUserCompany = {
    userId: 'user-1',
    companyId: mockCompanyId,
    role: 'ADMIN',
  };

  beforeAll(() => {
    // Configuración general
    // Nota: al ser ESM mocks, accedemos a las funciones .mock directamente
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configurar retornos por defecto para evitar ruido en los tests
    jwt.sign.mockReturnValue('mock-token');
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('hashed_password');
  });

  describe('login', () => {
    test('debería autenticar usuario correctamente', async () => {
      // Setup
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userCompany.findFirst.mockResolvedValue(mockUserCompany);
      prisma.refreshToken.create.mockResolvedValue({ token: 'abc' }); // CRÍTICO: mockear esto

      // Ejecución
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
        companyId: mockCompanyId,
      });

      // Verificaciones
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-token');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      // Verificamos que se creó el refresh token
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    test('debería lanzar error si usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
          companyId: mockCompanyId,
        })
      ).rejects.toThrow(/Credenciales inválidas/);
    });
  });

  describe('register', () => {
    test('debería registrar usuario correctamente', async () => {
      // Datos de entrada (solo lo que register acepta)
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
      };

      // Mocks
      prisma.user.findUnique.mockResolvedValue(null); // No existe
      prisma.user.create.mockResolvedValue({
        id: 'new-id',
        email: registerData.email,
        active: true
      });

      // Ejecución
      const result = await authService.register(registerData);

      // Verificaciones
      expect(result).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
            email: 'newuser@example.com'
        })
      }));
    });
  });
});