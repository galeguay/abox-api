const requirePermission = (permission) => {
  return async (req, res, next) => {
    const { userId, companyId } = req;

    const membership = await prisma.userCompany.findFirst({
      where: { userId, companyId },
      include: {
        rolePermissions: {
          include: { permission: true }
        },
        company: {
          include: {
            modules: {
              where: { enabled: true }
            }
          }
        }
      }
    });

    const hasPermission = membership.rolePermissions
      .some(rp => rp.permission.name === permission);

    const permissionObj = membership.rolePermissions
      .find(rp => rp.permission.name === permission);

    const hasModule = membership.company.modules
      .some(m => m.module.code === permissionObj.permission.moduleCode);

    if (!hasPermission || !hasModule) {
      throw createError(403, 'Funcionalidad no habilitada');
    }

    next();
  };
};
