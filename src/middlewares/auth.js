import jwt from 'jsonwebtoken';
import createError from 'http-errors';

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    throw createError(401, 'Token requerido');
  }

  const token = header.split(' ')[1];
  if (!token) {
    throw createError(401, 'Token inválido');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.companyId = payload.companyId;
    next();
  } catch (err) {
    throw createError(401, 'Token inválido o expirado');
  }
};
