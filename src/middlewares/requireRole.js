import createError from 'http-errors';
import prisma from '../../prisma/client.js';

const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {

    // Usuarios de plataforma pasan sin validar roles
    if (req.user?.type === 'PLATFORM') {
      return next();
    }

    const userId = req.user?.id;
    const companyId = req.companyId;

    if (!userId || !companyId) {
      throw createError(401, 'Contexto inválido');
    }

    const membership = await prisma.userCompany.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId
        }
      },
      select: { role: true }
    });

    if (!membership) {
      throw createError(403, 'No pertenece a la empresa');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw createError(403, 'Permisos insuficientes');
    }

    // Rol disponible para el resto del request
    req.user.role = membership.role;

    next();
  };
};

export default requireRole;
