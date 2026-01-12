import * as authService from './auth.service.js'; // Importa todas las funciones como un objeto

export const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body); 
    res.json(result);
  } catch (error) {
    next(error);
  }
};