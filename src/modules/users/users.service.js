import prisma from '../../../prisma/client.js';
import bcrypt from 'bcryptjs';
import AppError from '../../errors/AppError.js';
import { logAction } from '../../platform/audit/platform.audit.service.js';

const USER_SELECT = {
  id: true,
  email: true,
  active: true,
  createdAt: true,
};

// ==================== MI PERFIL ====================

// Obtener mi perfil
export const getMyProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      companies: {
        where: { active: true }, // Solo mostrar empresas donde estoy activo localmente
        select: {
          role: true,
          active: true, // Ver mi estado en esa empresa
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return user;
};

// Actualizar mi perfil
export const updateMyProfile = async (userId, data) => {
  const { firstName, lastName } = data;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updated;
};

// Cambiar mi contraseña
export const changeMyPassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatch) {
    throw new AppError('Contraseña actual incorrecta', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  logAction({
    userId,
    action: 'UPDATE',
    resource: 'USER_PASSWORD',
    resourceId: userId,
    details: { action: 'Cambio de contraseña' },
    status: 'SUCCESS',
  });

  return { message: 'Contraseña actualizada correctamente' };
};

// Ver mis empresas
export const getMyCompanies = async (userId) => {
  const companies = await prisma.userCompany.findMany({
    where: { 
      userId,
      active: true // Solo devolver empresas donde no estoy bloqueado
    },
    select: {
      id: true,
      role: true,
      company: {
        select: {
          id: true,
          name: true,
          active: true,
          createdAt: true,
        },
      },
    },
    orderBy: { company: { name: 'asc' } },
  });

  return companies;
};

// Cambiar empresa activa
export const switchActiveCompany = async (userId, companyId) => {
  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    include: { company: true }
  });

  if (!userCompany) {
    throw new AppError('No tienes acceso a esta compañía', 403);
  }

  // VALIDACIÓN NUEVA: Chequear bloqueo local
  if (!userCompany.active) {
    throw new AppError('Tu usuario está desactivado en esta compañía', 403);
  }

  if (!userCompany.company.active) {
    throw new AppError('La compañía se encuentra suspendida', 403);
  }

  logAction({
    userId,
    action: 'UPDATE',
    resource: 'ACTIVE_COMPANY',
    resourceId: companyId,
    details: { action: 'Cambio de empresa activa' },
    status: 'SUCCESS',
  });

  return { message: 'Empresa activa cambiada', role: userCompany.role };
};

// Ver mis permisos/roles en todas mis empresas
export const getMyPermissions = async (userId) => {
  const companies = await prisma.userCompany.findMany({
    where: { userId, active: true },
    select: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      role: true,
    },
  });

  return companies.map((uc) => ({
    companyId: uc.company.id,
    companyName: uc.company.name,
    role: uc.role,
  }));
};

// ==================== GESTIÓN DE USUARIOS EN EMPRESA ====================

// Listar usuarios de la empresa (Con Búsqueda y Filtros)
export const getCompanyUsers = async (companyId, page = 1, limit = 10, filters = {}) => {
  const { role, search } = filters;
  const skip = (page - 1) * limit;

  const where = { companyId };
  
  if (role) where.role = role;

  // NUEVO: Lógica de búsqueda
  if (search) {
    where.user = {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [users, total] = await Promise.all([
    prisma.userCompany.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        role: true,
        active: true, // Importante: estado local
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            active: true, // Estado global
            createdAt: true,
          },
        },
      },
      orderBy: { user: { createdAt: 'desc' } },
    }),
    prisma.userCompany.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Obtener un usuario específico de la empresa
export const getCompanyUserById = async (companyId, userId) => {
  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    select: {
      id: true,
      role: true,
      active: true, // Estado local
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          active: true, // Estado global
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!userCompany) {
    throw new AppError('Usuario no encontrado en esta compañía', 404);
  }

  return userCompany;
};

// Invitar usuario a empresa (Refactorizado con Transacciones)
export const inviteUserToCompany = async (companyId, email, role, invitedBy) => {
  // 1. Validar Rol
  const validRoles = getAvailableRoles().map(r => r.name);
  if (!validRoles.includes(role)) {
    throw new AppError('Rol inválido', 400);
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new AppError('Compañía no encontrada', 404);
  }

  // Usamos transacción para asegurar consistencia
  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({
      where: { email },
    });

    let isNewUser = false;

    // Si no existe, lo creamos
    if (!user) {
      const temporaryPassword = Math.random().toString(36).slice(-12);
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      isNewUser = true;

      user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: email.split('@')[0],
          lastName: '',
          userType: 'COMPANY',
        },
      });
      
      // TODO: Enviar email con temporaryPassword aquí
      console.log(`[TODO] Enviar email a ${email} con pass: ${temporaryPassword}`);
    }

    const existingUserCompany = await tx.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
    });

    if (existingUserCompany) {
      throw new AppError('El usuario ya existe en esta compañía', 400);
    }

    const userCompany = await tx.userCompany.create({
      data: {
        userId: user.id,
        companyId,
        role,
        active: true,
      },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return userCompany;
  });

  logAction({
    userId: invitedBy,
    action: 'CREATE',
    resource: 'COMPANY_USER',
    resourceId: result.user.id,
    details: {
      email,
      role,
      companyId,
    },
    status: 'SUCCESS',
  });

  return result;
};

// Cambiar rol de usuario en empresa
export const changeUserRole = async (companyId, userId, newRole, changedBy) => {
  // Validar Rol
  const validRoles = getAvailableRoles().map(r => r.name);
  if (!validRoles.includes(newRole)) {
    throw new AppError('Rol inválido', 400);
  }

  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!userCompany) {
    throw new AppError('Usuario no encontrado en esta compañía', 404);
  }

  const oldRole = userCompany.role;

  const updated = await prisma.userCompany.update({
    where: { id: userCompany.id },
    data: { role: newRole },
    select: {
      id: true,
      role: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  logAction({
    userId: changedBy,
    action: 'UPDATE',
    resource: 'COMPANY_USER_ROLE',
    resourceId: userId,
    details: {
      companyId,
      oldRole,
      newRole,
    },
    status: 'SUCCESS',
  });

  return updated;
};

// Desactivar usuario en empresa (CORREGIDO: Desactivación Local)
export const deactivateUserInCompany = async (companyId, userId, deactivatedBy) => {
  // Verificamos existencia usando la clave compuesta
  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!userCompany) {
    throw new AppError('Usuario no encontrado en esta compañía', 404);
  }

  // Modificamos SOLO la tabla UserCompany
  const updated = await prisma.userCompany.update({
    where: { id: userCompany.id },
    data: { active: false }, // Local flag
    select: {
      id: true,
      active: true,
      userId: true
    },
  });

  logAction({
    userId: deactivatedBy,
    action: 'UPDATE',
    resource: 'COMPANY_USER_DEACTIVATE',
    resourceId: userId,
    details: {
      companyId,
      action: 'Usuario desactivado localmente',
    },
    status: 'SUCCESS',
  });

  return updated;
};

// Activar usuario en empresa (NUEVA FUNCIÓN)
export const activateUserInCompany = async (companyId, userId, activatedBy) => {
  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!userCompany) {
    throw new AppError('Usuario no encontrado en esta compañía', 404);
  }

  const updated = await prisma.userCompany.update({
    where: { id: userCompany.id },
    data: { active: true },
    select: {
      id: true,
      active: true,
      userId: true
    },
  });

  logAction({
    userId: activatedBy,
    action: 'UPDATE',
    resource: 'COMPANY_USER_ACTIVATE',
    resourceId: userId,
    details: {
      companyId,
      action: 'Usuario reactivado localmente',
    },
    status: 'SUCCESS',
  });

  return updated;
};

// Remover usuario de empresa (Hard Delete de la relación)
export const removeUserFromCompany = async (companyId, userId, removedBy) => {
  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!userCompany) {
    throw new AppError('Usuario no encontrado en esta compañía', 404);
  }

  await prisma.userCompany.delete({
    where: { id: userCompany.id },
  });

  logAction({
    userId: removedBy,
    action: 'DELETE',
    resource: 'COMPANY_USER',
    resourceId: userId,
    details: {
      companyId,
      email: (await prisma.user.findUnique({ where: { id: userId } }))?.email,
    },
    status: 'SUCCESS',
  });

  return { message: 'Usuario removido de la compañía correctamente' };
};

// ==================== ROLES Y PERMISOS ====================

// Listar roles disponibles
export const getAvailableRoles = () => {
  return [
    {
      name: 'OWNER', // Agregado basado en tu Schema
      description: 'Dueño de la empresa',
      permissions: ['ALL'],
    },
    {
      name: 'ADMIN',
      description: 'Acceso completo a la empresa',
      permissions: [
        'manage_users',
        'manage_products',
        'manage_warehouses',
        'view_reports',
        'manage_sales',
        'manage_settings',
      ],
    },
    {
      name: 'MANAGER', // Tu schema usa este o similar
      description: 'Gestión de operaciones',
      permissions: [
        'manage_products',
        'manage_warehouses',
        'view_reports',
        'manage_sales',
      ],
    },
    {
      name: 'EMPLOYEE',
      description: 'Usuario operativo',
      permissions: ['view_products', 'manage_sales', 'view_reports'],
    },
    {
      name: 'READ_ONLY',
      description: 'Solo lectura',
      permissions: ['view_products', 'view_reports'],
    },
  ];
};

// Obtener permisos de un rol
export const getRolePermissions = (role) => {
  const roles = getAvailableRoles();
  return roles.find((r) => r.name === role) || null;
};

// ==================== MÉTODOS HEREDADOS (ADMIN PLATAFORMA) ====================
// Estos métodos suelen ser para SuperAdmin (Platform)

const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  return user;
};

const getAll = async () => {
  return prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: 'desc' },
  });
};

const updateUser = async (id, data) => {
  const payload = {};

  if (data.email) payload.email = data.email;
  if (typeof data.active === 'boolean') payload.active = data.active; // Esto sí es desactivación global

  return prisma.user.update({
    where: { id },
    data: payload,
    select: USER_SELECT,
  });
};

const changePassword = async (id, currentPassword, newPassword) => {
  // Lógica similar a changeMyPassword pero para admin
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('Usuario no encontrado', 404);
  
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id },
    data: { password: hash },
  });
};

const setActive = async (id, active) => {
  await prisma.user.update({
    where: { id },
    data: { active },
  });
};

export default {
  getById,
  getAll,
  updateUser,
  changePassword,
  setActive,
};