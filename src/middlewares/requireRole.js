import createError from 'http-errors';
import prisma from '../../prisma/client.js';

const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    const userId = req.userId;
    const companyId = req.companyId;

    if (!userId || !companyId) {
      throw createError(401, 'Contexto inválido');
    }

    const membership = await prisma.userCompany.findFirst({
      where: {
        userId,
        companyId
      }
    });

    if (!membership) {
      throw createError(403, 'No pertenece a la empresa');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw createError(403, 'Permisos insuficientes');
    }

    req.role = membership.role;
    next();
  };
};

export default requireRole;
