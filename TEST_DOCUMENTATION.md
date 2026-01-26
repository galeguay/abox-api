# Tests - ABOX API

Este documento describe la suite de tests para los módulos principales de la API ABOX.

## Configuración

### Instalación de dependencias
```bash
npm install
```

### Dependencias de testing
- **Jest**: Framework de testing
- **@jest/globals**: Globals de Jest para ES modules

## Scripts de test

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar tests en modo watch (detección de cambios)
```bash
npm run test:watch
```

### Generar reporte de cobertura
```bash
npm run test:coverage
```

## Estructura de tests

Los tests se encuentran en la carpeta `__tests__/` y siguen la estructura de módulos de la aplicación:

```
__tests__/
├── modules/
│   ├── auth/
│   │   └── auth.service.test.js
│   ├── users/
│   │   └── users.service.test.js
│   ├── products/
│   │   └── products.service.test.js
│   ├── orders/
│   │   └── orders.service.test.js
│   └── company/
│       └── company.service.test.js
```

## Módulos con Tests

### 1. Auth Service (`__tests__/modules/auth/auth.service.test.js`)

Tests para funcionalidades de autenticación:

- **login**: Autenticación de usuarios
  - ✓ Autenticar usuario correctamente
  - ✓ Error si faltan datos
  - ✓ Error si usuario no existe
  - ✓ Error si usuario está inactivo
  - ✓ Error si no pertenece a la empresa
  - ✓ Error si contraseña es incorrecta

- **register**: Registro de nuevos usuarios
  - ✓ Registrar usuario correctamente
  - ✓ Error si email ya existe

- **refreshToken**: Renovación de tokens JWT
  - ✓ Generar nuevo access token
  - ✓ Error si refresh token es inválido

### 2. Users Service (`__tests__/modules/users/users.service.test.js`)

Tests para gestión de usuarios:

- **getMyProfile**: Obtener perfil del usuario actual
  - ✓ Obtener el perfil del usuario actual
  - ✓ Error si usuario no existe

- **updateMyProfile**: Actualizar perfil del usuario
  - ✓ Actualizar el perfil del usuario
  - ✓ Validar que el usuario existe

- **changePassword**: Cambiar contraseña
  - ✓ Cambiar la contraseña del usuario
  - ✓ Error si contraseña actual es incorrecta

- **getUsers**: Listar usuarios
  - ✓ Obtener lista de usuarios con paginación
  - ✓ Filtrar usuarios por búsqueda

- **deleteUser**: Eliminar usuario (soft delete)
  - ✓ Eliminar un usuario de forma lógica
  - ✓ Error si usuario no existe

- **assignUserToCompany**: Asignar usuario a empresa
  - ✓ Asignar usuario a una empresa con rol
  - ✓ Error si asignación ya existe

### 3. Products Service (`__tests__/modules/products/products.service.test.js`)

Tests para gestión de productos:

- **createProduct**: Crear producto
  - ✓ Crear un producto correctamente
  - ✓ Generar SKU automático si no se proporciona
  - ✓ Error si SKU ya existe en la empresa

- **getProducts**: Listar productos
  - ✓ Obtener productos con paginación
  - ✓ Filtrar productos por búsqueda
  - ✓ Filtrar productos por estado activo

- **getProductById**: Obtener un producto
  - ✓ Obtener un producto por ID
  - ✓ Error si producto no existe
  - ✓ Error si producto no pertenece a la empresa

- **updateProduct**: Actualizar producto
  - ✓ Actualizar un producto correctamente
  - ✓ Validar SKU único al actualizar
  - ✓ Error si producto no existe

- **deleteProduct**: Eliminar producto
  - ✓ Marcar producto como inactivo
  - ✓ Error si producto no existe

### 4. Orders Service (`__tests__/modules/orders/orders.service.test.js`)

Tests para gestión de órdenes:

- **createOrder**: Crear orden
  - ✓ Crear una orden correctamente
  - ✓ Calcular totales correctamente
  - ✓ Error si producto no existe
  - ✓ Validar que existan todos los productos
  - ✓ Crear orden sin cliente

- **getOrders**: Listar órdenes
  - ✓ Obtener órdenes con paginación
  - ✓ Filtrar órdenes por estado
  - ✓ Filtrar órdenes por estado de pago
  - ✓ Calcular cantidad total de items en la orden

- **getOrderById**: Obtener una orden
  - ✓ Obtener una orden por ID
  - ✓ Error si orden no existe
  - ✓ Error si orden no pertenece a la empresa

- **updateOrderStatus**: Actualizar estado de orden
  - ✓ Actualizar el estado de la orden
  - ✓ Validar que la orden exista
  - ✓ Permitir transiciones de estado válidas

- **updatePaymentStatus**: Actualizar estado de pago
  - ✓ Actualizar el estado de pago
  - ✓ Error si estado de pago es inválido

- **deleteOrder**: Eliminar orden
  - ✓ Marcar una orden como cancelada
  - ✓ Error si orden no existe

### 5. Company Service (`__tests__/modules/company/company.service.test.js`)

Tests para gestión de empresas:

- **createCompany**: Crear empresa
  - ✓ Crear una empresa correctamente
  - ✓ Validar que el nombre sea proporcionado
  - ✓ Asignar automáticamente el creador como ADMIN

- **getCompany**: Obtener empresa
  - ✓ Obtener los detalles de una empresa
  - ✓ Error si empresa no existe

- **updateCompany**: Actualizar empresa
  - ✓ Actualizar los datos de la empresa
  - ✓ Validar que la empresa exista
  - ✓ Permitir actualizar solo campos específicos

- **deleteCompany**: Eliminar empresa
  - ✓ Marcar la empresa como inactiva
  - ✓ Error si empresa no existe

- **getCompanyUsers**: Listar usuarios de la empresa
  - ✓ Obtener usuarios de una empresa
  - ✓ Permitir paginación en lista de usuarios

- **addUserToCompany**: Agregar usuario a empresa
  - ✓ Agregar un usuario a la empresa
  - ✓ Error si usuario ya pertenece a la empresa

- **removeUserFromCompany**: Remover usuario de empresa
  - ✓ Remover un usuario de la empresa
  - ✓ Error si usuario no pertenece a la empresa
  - ✓ Error si intenta remover el último admin

## Mocking

Se utiliza Jest para mockear el cliente de Prisma (`prisma`). Los mocks se configuran al inicio de cada suite de tests con `jest.unstable_mockModule()`.

### Ejemplo de mock básico:
```javascript
jest.unstable_mockModule('../../../prisma/client.js');

describe('Service', () => {
  test('should work', async () => {
    prisma.model.findUnique.mockResolvedValue(mockData);
    // ... test code
  });
});
```

## Cobertura de tests

La configuración de Jest requiere una cobertura mínima del 50% en:
- Branches
- Functions
- Lines
- Statements

Para ver el reporte detallado:
```bash
npm run test:coverage
```

## Próximos pasos

Para mejorar la cobertura de tests, considera agregar:

1. **Tests de integración**: Para probar flujos completos entre módulos
2. **Tests de controladores**: Para validar endpoints HTTP
3. **Tests de validadores**: Para esquemas de validación
4. **Tests de middleware**: Para autenticación y autorización
5. **Tests de edge cases**: Casos límite y situaciones especiales

## Troubleshooting

### Error: "Cannot find module"
Asegúrate de que las rutas de importación en los tests sean correctas.

### Error: "jest is not defined"
Importa `describe`, `test`, `expect` desde `@jest/globals`:
```javascript
import { describe, test, expect } from '@jest/globals';
```

### Error: Mock no funciona
Verifica que `jest.unstable_mockModule()` se ejecute antes de importar el módulo a probar.

## Contribuciones

Cuando agregues nuevas funcionalidades, asegúrate de:
1. Escribir tests para la nueva funcionalidad
2. Mantener o mejorar la cobertura de tests
3. Ejecutar `npm test` antes de hacer commit
4. Verificar que no hay errores en `npm run test:coverage`
