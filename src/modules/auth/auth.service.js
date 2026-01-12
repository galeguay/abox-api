import prisma from '../../prisma/client.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import createError from 'http-errors';

export const login = async ({ email, password, companyId }) => {
  if (!email || !password || !companyId) {
    throw createError(400, 'Datos incompletos');
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !user.active) {
    throw createError(401, 'Credenciales inválidas');
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw createError(401, 'Credenciales inválidas');
  }

  const membership = await prisma.userCompany.findFirst({
    where: {
      userId: user.id,
      companyId
    }
  });

  if (!membership) {
    throw createError(403, 'No pertenece a la empresa');
  }

  const token = jwt.sign(
    {
      userId: user.id,
      companyId
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: membership.role
    }
  };
};
