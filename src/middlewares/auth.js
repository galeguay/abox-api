import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import prisma from '../../prisma/client.js';

export const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    throw createError(401, 'Token requerido');
  }

  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    throw createError(401, 'Token inválido');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Identidad común
    req.user = {
      id: payload.userId,
      type: payload.type
    };


    if (payload.type === 'COMPANY') {
      if (!payload.companyId) {
        throw createError(401, 'Empresa no definida');
      }

      const company = await prisma.company.findUnique({
        where: { id: payload.companyId },
        select: { active: true }
      });

      if (!company || !company.active) {
        throw createError(403, 'Empresa suspendida');
      }

      req.companyId = payload.companyId;
    }

    // Usuarios de plataforma NO pasan por validación de empresa
    next();
  } catch (err) {
    throw createError(401, 'Token inválido o expirado');
  }
};
