import prisma from '../../../prisma/client.js';
import AppError from '../../errors/AppError.js';

// Crear un nuevo usuario admin
export const createAdmin = async (data) => {
  const { email, password, firstName, lastName } = data;

  // Verificar si el email ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError('El email ya está registrado', 400);
  }

  // Crear el usuario con rol ADMIN y tipo PLATFORM
  const user = await prisma.user.create({
    data: {
      email,
      password,
      firstName,
      lastName,
      role: 'ADMIN',
      userType: 'PLATFORM',
    },
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    userType: user.userType,
    createdAt: user.createdAt,
  };
};

// Obtener todos los admins
export const getAdmins = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [admins, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: 'ADMIN',
        userType: 'PLATFORM',
      },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        userType: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({
      where: {
        role: 'ADMIN',
        userType: 'PLATFORM',
      },
    }),
  ]);

  return {
    data: admins,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Obtener un admin por ID
export const getAdminById = async (id) => {
  const admin = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      userType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!admin || admin.userType !== 'PLATFORM' || admin.role !== 'ADMIN') {
    throw new AppError('Admin no encontrado', 404);
  }

  return admin;
};

// Actualizar un admin
export const updateAdmin = async (id, data) => {
  const { email, firstName, lastName } = data;

  // Verificar que el admin existe
  const admin = await getAdminById(id);

  // Si se intenta cambiar el email, verificar que no exista otro usuario con ese email
  if (email && email !== admin.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('El email ya está registrado', 400);
    }
  }

  const updatedAdmin = await prisma.user.update({
    where: { id },
    data: {
      ...(email && { email }),
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      userType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedAdmin;
};

// Eliminar un admin
export const deleteAdmin = async (id) => {
  // Verificar que el admin existe
  await getAdminById(id);

  await prisma.user.delete({
    where: { id },
  });

  return { message: 'Admin eliminado correctamente' };
};
