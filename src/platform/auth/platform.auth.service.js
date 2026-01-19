import prisma from '../../../prisma/client.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';

export const login = async ({ email, password }) => {
  if (!email || !password) {
    throw createError(400, 'Datos incompletos');
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.active) {
    throw createError(401, 'Credenciales inválidas');
  }

  if (user.type !== 'PLATFORM') {
    throw createError(403, 'No es un usuario de plataforma');
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw createError(401, 'Credenciales inválidas');
  }

  const token = jwt.sign(
    {
      userId: user.id,
      type: user.type
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      type: user.type
    }
  };
};
