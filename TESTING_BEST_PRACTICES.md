# Testing Best Practices - ABOX API

Este documento describe las mejores prácticas para escribir y mantener tests en el proyecto ABOX API.

## Principios Generales

### 1. **AAA Pattern (Arrange-Act-Assert)**

Todo test debe seguir el patrón AAA:

```javascript
test('debería crear un usuario correctamente', async () => {
  // ARRANGE: Preparar datos y mocks
  const userData = { email: 'test@example.com', password: 'secure123' };
  prisma.user.create.mockResolvedValue(userData);

  // ACT: Ejecutar la función
  const result = await userService.createUser(userData);

  // ASSERT: Verificar el resultado
  expect(result.email).toBe('test@example.com');
  expect(prisma.user.create).toHaveBeenCalled();
});
```

### 2. **One Assertion Focus**

Cada test debe verificar un comportamiento específico:

```javascript
// ✓ BUENO: Un comportamiento por test
test('debería validar email requerido', async () => {
  await expect(userService.createUser({ password: '123' }))
    .rejects.toThrow('Email requerido');
});

// ✗ MALO: Múltiples comportamientos en un test
test('debería crear usuario correctamente', async () => {
  const user = await userService.createUser(userData);
  expect(user.email).toBe('test@example.com');
  expect(user.password).toBeDefined();
  expect(user.active).toBe(true);
  expect(user.createdAt).toBeDefined();
  // ... más assertions
});
```

### 3. **Nombres Descriptivos**

Los nombres de tests deben ser claros y descriptivos:

```javascript
// ✓ BUENO
test('debería lanzar error si email ya está registrado', async () => {});
test('debería actualizar solo campos permitidos', async () => {});

// ✗ MALO
test('it works', async () => {});
test('test create', async () => {});
```

### 4. **Usar Test Helpers**

Utiliza los helpers en `__tests__/helpers/test-helpers.js`:

```javascript
import { createMockUser, createMockProduct } from '../../helpers/test-helpers.js';

describe('Product Service', () => {
  const mockProduct = createMockProduct({
    name: 'Custom Product',
    price: 99.99,
  });
});
```

## Estructura de Tests

### Organizar por describe blocks

```javascript
describe('Auth Service', () => {
  describe('login', () => {
    test('debería autenticar usuario válido', async () => {});
    test('debería rechazar contraseña incorrecta', async () => {});
  });

  describe('register', () => {
    test('debería crear nuevo usuario', async () => {});
    test('debería rechazar email duplicado', async () => {});
  });
});
```

### Setup y Teardown

Usa `beforeEach` y `afterEach` para setup/cleanup:

```javascript
describe('Database Operations', () => {
  beforeEach(() => {
    // Ejecuta antes de cada test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ejecuta después de cada test
    jest.restoreAllMocks();
  });

  test('debería guardar datos', async () => {});
});
```

## Mocking Best Practices

### 1. **Mock de Prisma**

Siempre mockea Prisma al inicio del archivo:

```javascript
jest.unstable_mockModule('../../../prisma/client.js');

describe('Service', () => {
  test('debería consultar la base de datos', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    // ... test
  });
});
```

### 2. **Reset Mocks Entre Tests**

```javascript
beforeEach(() => {
  jest.clearAllMocks(); // Limpia conteo de llamadas
});

afterEach(() => {
  jest.restoreAllMocks(); // Restaura implementación original
});
```

### 3. **Verificar Llamadas a Mocks**

```javascript
test('debería pasar los datos correctos a Prisma', async () => {
  // ASSERT - Verificar cómo se llamó
  expect(prisma.user.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      email: 'test@example.com',
    }),
  });

  // Verificar número de llamadas
  expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
});
```

## Tests de Errores

### Verificar errores específicos

```javascript
test('debería lanzar error si usuario no existe', async () => {
  prisma.user.findUnique.mockResolvedValue(null);

  await expect(
    userService.getUser('nonexistent')
  ).rejects.toThrow('Usuario no encontrado');
});

test('debería lanzar AppError con código 404', async () => {
  prisma.user.findUnique.mockResolvedValue(null);

  try {
    await userService.getUser('nonexistent');
    fail('Should have thrown an error');
  } catch (error) {
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Usuario no encontrado');
  }
});
```

## Tests de Validación

### Validar entrada de datos

```javascript
test('debería validar email con formato correcto', async () => {
  const invalidEmails = [
    'invalid',
    '@example.com',
    'user@',
    '',
  ];

  for (const email of invalidEmails) {
    await expect(
      userService.createUser({ email, password: '123' })
    ).rejects.toThrow();
  }
});
```

## Tests de Pagination

### Verificar estructura de paginación

```javascript
test('debería retornar estructura de paginación correcta', async () => {
  prisma.product.findMany.mockResolvedValue(mockProducts);
  prisma.product.count.mockResolvedValue(25);

  const result = await productService.getProducts(companyId, {
    page: 2,
    limit: 10,
  });

  expect(result.pagination).toEqual({
    page: 2,
    limit: 10,
    total: 25,
    pages: 3,
  });
});
```

## Evitar Antipatrones

### ✗ MALO: Tests que dependen uno del otro

```javascript
let userId;

test('debería crear usuario', async () => {
  const user = await userService.createUser(userData);
  userId = user.id; // Test siguiente depende de esto
});

test('debería obtener usuario creado', async () => {
  // Este test solo funciona si el anterior pasó
  const user = await userService.getUser(userId);
  expect(user).toBeDefined();
});
```

### ✓ BUENO: Tests independientes

```javascript
test('debería crear usuario', async () => {
  const user = await userService.createUser(userData);
  expect(user.id).toBeDefined();
});

test('debería obtener usuario por id', async () => {
  const mockUser = createMockUser();
  prisma.user.findUnique.mockResolvedValue(mockUser);
  
  const user = await userService.getUser(mockUser.id);
  expect(user).toBeDefined();
});
```

### ✗ MALO: Tests que prueban múltiples funciones

```javascript
test('debería crear producto y stock', async () => {
  const product = await productService.createProduct(data);
  const stock = await stockService.createStock(product.id, warehouseId);
  expect(product).toBeDefined();
  expect(stock).toBeDefined();
});
```

### ✓ BUENO: Tests unitarios

```javascript
describe('Product Service', () => {
  test('debería crear producto', async () => {
    const product = await productService.createProduct(data);
    expect(product).toBeDefined();
  });
});

describe('Stock Service', () => {
  test('debería crear stock', async () => {
    const stock = await stockService.createStock(productId, warehouseId);
    expect(stock).toBeDefined();
  });
});
```

## Cobertura de Tests

### Objetivos de cobertura

- **Statements**: 80%+ (líneas ejecutadas)
- **Branches**: 70%+ (if/else, ternarios)
- **Functions**: 80%+ (funciones llamadas)
- **Lines**: 80%+ (líneas cubiertas)

Ver cobertura:
```bash
npm run test:coverage
```

## Tips de Debugging

### Usar console.log en tests

```javascript
test('debería procesar datos', async () => {
  const result = await service.processData(input);
  console.log('Result:', result); // Se mostrará si test falla
  expect(result).toBeDefined();
});
```

### Ejecutar un test específico

```bash
# Solo tests que coincidan con el patrón
npm test -- auth.service.test.js

# Solo un describe block
npm test -- -t "Auth Service"

# Solo un test específico
npm test -- -t "debería autenticar usuario"
```

### Modo watch

```bash
npm run test:watch
```

## Checklist para nuevos tests

- [ ] ¿El test tiene un nombre descriptivo?
- [ ] ¿Sigue el patrón AAA (Arrange-Act-Assert)?
- [ ] ¿Prueba un solo comportamiento?
- [ ] ¿Usa helpers para crear datos mock?
- [ ] ¿Tiene setup/teardown si lo necesita?
- [ ] ¿Verifica mocks llamados con datos correctos?
- [ ] ¿No depende de otros tests?
- [ ] ¿Cubre casos de error?
- [ ] ¿Cubre casos normales/happy path?
- [ ] ¿Cubre edge cases si aplica?

## Referencias

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
