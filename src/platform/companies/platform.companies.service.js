import prisma from '../../../prisma/client.js';
import AppError from '../../errors/AppError.js';

// Crear una nueva compañía
export const createCompany = async (data) => {
  const { name } = data;

  const company = await prisma.company.create({
    data: {
      name,
      active: true,
    },
    select: {
      id: true,
      name: true,
      active: true,
      createdAt: true,
    },
  });

  return company;
};

// Obtener todas las compañías
export const getCompanies = async (page = 1, limit = 10, active) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (active !== undefined) {
    where.active = active === 'true';
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            products: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.company.count({ where }),
  ]);

  return {
    data: companies,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Obtener una compañía por ID
export const getCompanyById = async (id) => {
  const company = await prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      active: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          products: true,
          warehouses: true,
          sales: true,
          orders: true,
        },
      },
    },
  });

  if (!company) {
    throw new AppError('Compañía no encontrada', 404);
  }

  return company;
};

// Actualizar una compañía
export const updateCompany = async (id, data) => {
  const { name, active } = data;

  // Verificar que la compañía existe
  await getCompanyById(id);

  const updatedCompany = await prisma.company.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(active !== undefined && { active }),
    },
    select: {
      id: true,
      name: true,
      active: true,
      createdAt: true,
    },
  });

  return updatedCompany;
};

// Obtener todos los usuarios de una compañía
export const getCompanyUsers = async (companyId, page = 1, limit = 10) => {
  // Verificar que la compañía existe
  await getCompanyById(companyId);

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.userCompany.findMany({
      where: { companyId },
      skip,
      take: limit,
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            active: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    }),
    prisma.userCompany.count({ where: { companyId } }),
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

// Asignar un usuario a una compañía
export const assignUserToCompany = async (companyId, data) => {
  const { userId, role } = data;

  // Verificar que la compañía existe
  await getCompanyById(companyId);

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('Usuario no encontrado', 404);
  }

  // Verificar si el usuario ya está asignado a la compañía
  const existingAssignment = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (existingAssignment) {
    throw new AppError('El usuario ya está asignado a esta compañía', 400);
  }

  const userCompany = await prisma.userCompany.create({
    data: {
      userId,
      companyId,
      role,
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
};

// Actualizar rol de un usuario en una compañía
export const updateUserCompanyRole = async (companyId, userId, role) => {
  // Verificar que la compañía existe
  await getCompanyById(companyId);

  // Verificar que la asignación existe
  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!userCompany) {
    throw new AppError(
      'El usuario no está asignado a esta compañía',
      404
    );
  }

  const updated = await prisma.userCompany.update({
    where: { id: userCompany.id },
    data: { role },
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

  return updated;
};

// Remover un usuario de una compañía
export const removeUserFromCompany = async (companyId, userId) => {
  // Verificar que la compañía existe
  await getCompanyById(companyId);

  // Verificar que la asignación existe
  const userCompany = await prisma.userCompany.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!userCompany) {
    throw new AppError(
      'El usuario no está asignado a esta compañía',
      404
    );
  }

  await prisma.userCompany.delete({
    where: { id: userCompany.id },
  });

  return { message: 'Usuario removido de la compañía correctamente' };
};
