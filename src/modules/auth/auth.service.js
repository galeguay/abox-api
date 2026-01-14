import prisma from '../../../prisma/client.js';
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

export const register = async ({ email, password }) => {
  if (!email || !password) {
    throw createError(400, 'Datos incompletos');
  }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw createError(400, 'El email ya está registrado');
  }

  const hashed = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashed,
      active: true
    },
    select: { id: true, email: true }
  });

  return newUser;
};
