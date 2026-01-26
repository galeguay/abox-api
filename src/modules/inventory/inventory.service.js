import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';

export const getStockByProduct = async (companyId, productId, warehouseId) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });

  if (!product) {
    throw new AppError('Producto no encontrado', 404);
  }

  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, companyId },
  });

  if (!warehouse) {
    throw new AppError('Almacén no encontrado', 404);
  }

  const stock = await prisma.stock.findFirst({
    where: { productId, warehouseId },
  });

  return {
    product: { id: product.id, name: product.name, sku: product.sku },
    warehouse: { id: warehouse.id, name: warehouse.name },
    quantity: stock?.quantity || 0,
    lastUpdated: stock?.updatedAt,
  };
};

export const getTotalStock = async (companyId, productId) => {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });

  if (!product) {
    throw new AppError('Producto no encontrado', 404);
  }

  const stocks = await prisma.stock.findMany({
    where: { productId },
    include: { warehouse: { select: { id: true, name: true } } },
  });

  const totalQuantity = stocks.reduce((sum, s) => sum + s.quantity, 0);

  return {
    product: { id: product.id, name: product.name, sku: product.sku },
    totalQuantity,
    byWarehouse: stocks.map(s => ({
      warehouse: s.warehouse,
      quantity: s.quantity,
    })),
  };
};

export const getInventoryReport = async (companyId) => {
  const products = await prisma.product.findMany({
    where: { companyId },
    include: {
      stock: {
        include: { warehouse: { select: { id: true, name: true } } },
      },
    },
  });

  const report = products.map(product => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    totalQuantity: product.stock.reduce((sum, s) => sum + s.quantity, 0),
    byWarehouse: product.stock.map(s => ({
      warehouse: s.warehouse,
      quantity: s.quantity,
    })),
  }));

  return report;
};
