-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('COMPLETED', 'CANCELED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "Sale_companyId_warehouseId_idx" ON "Sale"("companyId", "warehouseId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
