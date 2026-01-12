const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;

  // Log interno (en prod después va a un logger)
  console.error({
    message: err.message,
    status,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  res.status(status).json({
    ok: false,
    message:
      status === 500
        ? 'Error interno del servidor'
        : err.message
  });
};

export default errorHandler;