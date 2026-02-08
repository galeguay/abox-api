import * as platformUserService from './platform-users.service.js';

export const getUsers = async (req, res) => {
    try {
        const { page, limit, search, type } = req.query;

        const result = await platformUserService.getUsers({
            page,
            limit,
            search,
            type
        });

        res.json({
            status: 'success',
            data: result.data,
            meta: result.meta
        });

    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor al obtener usuarios'
        });
    }
};

export const createUser = async (req, res, next) => {
    try {
        const userData = req.body;

        const newUser = await platformUserService.createUser(userData);

        res.status(201).json({
            status: 'success',
            data: newUser,
            message: 'Usuario creado exitosamente'
        });

    } catch (error) {
        // Pasamos el error al manejador global (si usas next) o lo manejamos aquí
        next(error); 
    }
};