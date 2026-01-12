import prisma from '../../../prisma/client.js';
import createError from 'http-errors';
import bcrypt from 'bcryptjs';

const createAndAssignUser = async (userData, companyId) => {
  const { email, password, role } = userData;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    throw createError(400, 'El email ya está registrado');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Transacción atómica: se crea el usuario y se une a la empresa o no se hace nada 
  return await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        password: hashedPassword
      }
    });

    const membership = await tx.userCompany.create({
      data: {
        userId: newUser.id,
        companyId: companyId,
        role: role // Basado en el Enum Role 
      }
    });

    return { user: newUser, role: membership.role };
  });
};

const getCompanyMembers = async (companyId) => {
  return await prisma.userCompany.findMany({
    where: { companyId },
    include: {
      user: {
        select: { id: true, email: true, active: true }
      }
    },
    orderBy: { user: { email: 'asc' } }
  });
};

const updateMemberRole = async (companyId, userId, newRole) => {
  // Usamos el ID compuesto generado por Prisma para la relación 
  return await prisma.userCompany.update({
    where: {
      userId_companyId: { userId, companyId }
    },
    data: { role: newRole }
  });
};

const removeMember = async (companyId, userId) => {
  return await prisma.userCompany.delete({
    where: {
      userId_companyId: { userId, companyId }
    }
  });
};

export default {
  createAndAssignUser,
  getCompanyMembers,
  updateMemberRole,
  removeMember
};