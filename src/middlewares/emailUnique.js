import { prisma } from '../lib/prisma.js';

// CREATE (register / alta por empresa)
export const emailUniqueOnCreate = (field = 'email') => {
  return async (req, res, next) => {
    const email = req.body[field];
    if (!email) return next();

    const exists = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (exists) {
      return res.status(409).json({
        message: 'El email ya está registrado',
      });
    }

    next();
  };
};

// UPDATE (perfil propio o admin)
export const emailUniqueOnUpdate = ({
  field = 'email',
  getUserId,
}) => {
  return async (req, res, next) => {
    const email = req.body[field];
    if (!email) return next();

    const userId = getUserId(req);
    if (!userId) return next();

    const exists = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (exists) {
      return res.status(409).json({
        message: 'El email ya está en uso por otro usuario',
      });
    }

    next();
  };
};
