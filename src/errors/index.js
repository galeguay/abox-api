import AppError from './AppError.js';

export { AppError };

export const NotFoundError = (msg = 'Recurso no encontrado') =>
    new AppError(msg, 404);

export const BadRequestError = (msg = 'Solicitud inválida') =>
    new AppError(msg, 400);

export const UnauthorizedError = (msg = 'No autorizado') =>
    new AppError(msg, 401);

export const ForbiddenError = (msg = 'Prohibido') =>
    new AppError(msg, 403);

export const ConflictError = (msg = 'Conflicto') =>
    new AppError(msg, 409);

export const TooManyRequestsError = (msg = 'Demasiadas solicitudes, intente más tarde') =>
    new AppError(msg, 429);