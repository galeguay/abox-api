/**
 * Fuente única de verdad para ROLES
 */
export const ROLES = Object.freeze({
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  READ_ONLY: 'READ_ONLY',
});

/**
 * Array de roles válidos (para validators y services)
 */
export const AVAILABLE_ROLES = Object.values(ROLES);

/**
 * Metadata de roles (descripción + permisos)
 * Esto es lo que se expone al frontend
 */
export const ROLE_META = Object.freeze({
  [ROLES.OWNER]: {
    description: 'Dueño de la empresa',
    permissions: ['ALL'],
  },

  [ROLES.ADMIN]: {
    description: 'Administrador con acceso completo',
    permissions: [
      'manage_users',
      'manage_settings',
      'manage_products',
      'manage_sales',
      'view_reports',
    ],
  },

  [ROLES.MANAGER]: {
    description: 'Gestión operativa',
    permissions: [
      'manage_products',
      'manage_sales',
      'view_reports',
    ],
  },

  [ROLES.EMPLOYEE]: {
    description: 'Usuario operativo',
    permissions: [
      'manage_sales',
      'view_products',
    ],
  },

  [ROLES.READ_ONLY]: {
    description: 'Usuario solo lectura',
    permissions: [
      'view_products',
      'view_reports',
    ],
  },
});

/**
 * Helper: validar rol
 */
export const isValidRole = (role) => AVAILABLE_ROLES.includes(role);

/**
 * Helper: obtener permisos de un rol
 */
export const getRolePermissions = (role) => {
  return ROLE_META[role]?.permissions ?? [];
};

/**
 * Helper: obtener roles disponibles para frontend
 */
export const getAvailableRoles = () => {
  return AVAILABLE_ROLES.map((role) => ({
    name: role,
    ...ROLE_META[role],
  }));
};

export const ALL_ROLES = AVAILABLE_ROLES;

export const STAFF_ROLES = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.EMPLOYEE,
];
