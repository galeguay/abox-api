-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "saleCategoryId" TEXT;

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "type" "UserType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesBySaleCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "saleCategoryId" TEXT NOT NULL,
    "totalSales" DECIMAL(65,30) NOT NULL,
    "salesCount" INTEGER NOT NULL,

    CONSTRAINT "SalesBySaleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleCategory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "SalesBySaleCategory_companyId_idx" ON "SalesBySaleCategory"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesBySaleCategory_companyId_saleCategoryId_key" ON "SalesBySaleCategory"("companyId", "saleCategoryId");

-- CreateIndex
CREATE INDEX "SaleCategory_companyId_active_idx" ON "SaleCategory"("companyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "SaleCategory_companyId_name_key" ON "SaleCategory"("companyId", "name");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_saleCategoryId_fkey" FOREIGN KEY ("saleCategoryId") REFERENCES "SaleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesBySaleCategory" ADD CONSTRAINT "SalesBySaleCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesBySaleCategory" ADD CONSTRAINT "SalesBySaleCategory_saleCategoryId_fkey" FOREIGN KEY ("saleCategoryId") REFERENCES "SaleCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleCategory" ADD CONSTRAINT "SaleCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
