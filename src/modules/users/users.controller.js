import userService from './users.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const getMe = asyncWrapper(async (req, res) => {
    const user = await userService.getById(req.user.id);
    res.json({ ok: true, data: user });
});

export const updateMe = asyncWrapper(async (req, res) => {
    const user = await userService.updateUser(
        req.user.id,
        req.body
    );

    res.json({ ok: true, data: user });
});

export const changePassword = asyncWrapper(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await userService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
    );

    res.json({ ok: true, message: 'Contraseña actualizada' });
});

export const getUsers = asyncWrapper(async (req, res) => {
    const users = await userService.getAll();
    res.json({ ok: true, data: users });
});

export const getUserById = asyncWrapper(async (req, res) => {
    const user = await userService.getById(req.params.id);
    res.json({ ok: true, data: user });
});

export const updateUser = asyncWrapper(async (req, res) => {
    const user = await userService.updateUser(
        req.params.id,
        req.body
    );

    res.json({ ok: true, data: user });
});

export const activateUser = asyncWrapper(async (req, res) => {
    await userService.setActive(req.params.id, true);
    res.json({ ok: true, message: 'Usuario activado' });
});

export const deactivateUser = asyncWrapper(async (req, res) => {
    await userService.setActive(req.params.id, false);
    res.json({ ok: true, message: 'Usuario desactivado' });
});
