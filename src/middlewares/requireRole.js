import createError from 'http-errors';

const requireRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    if (req.user?.type === 'PLATFORM') {
      return next();
    }

    const userRole = req.role; 

    if (!userRole) {
      throw createError(403, 'No se pudo determinar el rol del usuario');
    }

    if (!allowedRoles.includes(userRole)) {
      throw createError(403, 'Permisos insuficientes');
    }

    next();
  };
};

export default requireRole;