import prisma from '../../../prisma/client.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import createError from 'http-errors';

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

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

  // 🔐 Access token corto
  const accessToken = jwt.sign(
    {
      sub: user.id,
      type: 'PLATFORM'
    },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );

  // ♻️ Refresh token persistente
  const refreshToken = crypto.randomUUID();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      type: 'PLATFORM',
      expiresAt: addDays(new Date(), 14)
    }
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      type: user.type
    }
  };
};

export const refresh = async (refreshToken) => {
  const token = await prisma.refreshToken.findUnique({
    where: { token: refreshToken }
  });

  if (!token || token.expiresAt < new Date()) {
    throw createError(401, 'Refresh token inválido');
  }

  const accessToken = jwt.sign(
    {
      sub: token.userId,
      type: 'PLATFORM'
    },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );

  return accessToken;
};

export const logout = async (userId) => {
  await prisma.refreshToken.deleteMany({
    where: {
      userId,
      type: 'PLATFORM'
    }
  });
};