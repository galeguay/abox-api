import { logAction } from '../platform/audit/platform.audit.service.js';

/**
 * Middleware para registrar acciones de auditoría
 * Debe usarse después de las rutas que se quieren auditar
 */
export const auditMiddleware = (action, resource, getResourceId = null) => {
  return (req, res, next) => {
    // Guardar el método original de res.json
    const originalJson = res.json.bind(res);

    // Interceptar res.json para registrar cuando se complete la respuesta
    res.json = function (data) {
      // Solo registrar si la acción fue exitosa (status 2xx)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = getResourceId ? getResourceId(req, data) : req.params.id || null;
        const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        logAction({
          userId: req.user?.sub || 'unknown',
          action,
          resource,
          resourceId,
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            body: action !== 'READ' ? req.body : undefined,
          },
          ipAddress,
          userAgent,
          status: 'SUCCESS',
        });
      }

      // Llamar al método original de res.json
      return originalJson(data);
    };

    // También guardar el método original de res.status para capturar errores
    const originalStatus = res.status.bind(res);
    res.status = function (code) {
      // Si es un código de error (4xx o 5xx), registrarlo también
      if (code >= 400) {
        res.isError = true;
        res.errorCode = code;
      }
      return originalStatus(code);
    };

    next();
  };
};

/**
 * Middleware para registrar errores de auditoría
 */
export const auditErrorMiddleware = (action, resource) => {
  return (err, req, res, next) => {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    logAction({
      userId: req.user?.sub || 'unknown',
      action,
      resource,
      resourceId: req.params.id || null,
      details: {
        method: req.method,
        path: req.path,
        error: err.message,
        body: req.body,
      },
      ipAddress,
      userAgent,
      status: 'FAILED',
    });

    next(err);
  };
};
