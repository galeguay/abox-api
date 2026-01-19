import { prisma } from '../../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { NotFoundError, BadRequestError } from '../../errors/index.js';

const USER_SELECT = {
  id: true,
  email: true,
  active: true,
  createdAt: true,
};


const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  });

  if (!user) {
    throw NotFoundError('Usuario no encontrado');
  }

  return user;
};

const getAll = async () => {
  return prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { createdAt: 'desc' },
  });
};


const updateUser = async (id, data) => {
  const payload = {};

  if (data.email) payload.email = data.email;
  if (typeof data.active === 'boolean') payload.active = data.active;

  return prisma.user.update({
    where: { id },
    data: payload,
    select: USER_SELECT,
  });
};


const changePassword = async (id, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { password: true },
  });

if (!user) {
  throw NotFoundError('Usuario no encontrado');
}


  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) {
    throw BadRequestError('Contraseña actual incorrecta');
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { password: hash },
  });
};

const setActive = async (id, active) => {
  await prisma.user.update({
    where: { id },
    data: { active },
  });
};


export default {
  getById,
  getAll,
  updateUser,
  changePassword,
  setActive,
};
