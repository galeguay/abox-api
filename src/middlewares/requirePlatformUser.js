export const requirePlatformUser = (req, res, next) => {
  if (req.user.type !== 'PLATFORM') {
    return next(createError(403, 'Acceso solo plataforma'));
  }
  next();
};
