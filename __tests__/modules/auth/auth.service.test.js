import { describe, test, expect, beforeAll, beforeEach, jest } from '@jest/globals';

// 1. MOCKS must be defined before imports
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

// 2. DYNAMIC IMPORTS
const { default: prisma } = await import('../../../prisma/client.js');
const { default: bcrypt } = await import('bcryptjs');
const { default: jwt } = await import('jsonwebtoken');
const authService = await import('../../../src/modules/auth/auth.service.js');

describe('Auth Service (ESM)', () => {
  // FIX 1: Add 'companies' array to the mock user structure
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: '$2a$10$hashedpassword',
    active: true,
    firstName: 'Test',
    lastName: 'User',
    type: 'USER', 
    companies: [
      {
        role: 'ADMIN',
        active: true,
        company: {
            id: 'company-1',
            name: 'Test Company',
            active: true
        }
      }
    ]
  };

  const mockCompanyId = 'company-1';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock returns
    jwt.sign.mockReturnValue('mock-token');
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('hashed_password');
  });

  describe('login', () => {
    test('debería autenticar usuario y devolver identityToken (Flow: Select Company)', async () => {
      // Setup
      prisma.user.findUnique.mockResolvedValue(mockUser);
      
      // Ejecución
      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // Verificaciones (Updated to match auth.service.js logic)
      expect(result).toBeDefined();
      
      // FIX 2: Check for identityToken, not accessToken (Standard User Flow)
      expect(result.identityToken).toBe('mock-token'); 
      expect(result.mode).toBe('SELECT_COMPANY');
      
      // Verify companies are mapped correctly
      expect(result.companies).toHaveLength(1);
      expect(result.companies[0].id).toBe('company-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
            where: { email: 'test@example.com' }
        })
      );
      
      // Note: refreshToken is NOT created in step 1 of your new flow, 
      // so we should NOT expect it here.
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    test('debería lanzar error si usuario no existe o es inválido', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      // FIX 3: Update error message expectation
      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(/Usuario inválido/); 
    });
  });

  describe('register', () => {
    test('debería registrar usuario correctamente', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-id',
        email: registerData.email,
        active: true
      });

      const result = await authService.register(registerData);

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