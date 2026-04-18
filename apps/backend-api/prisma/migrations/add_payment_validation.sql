-- CreateTable
CREATE TABLE "PaymentValidation" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'CARD',
    "status" TEXT NOT NULL,
    "cardLastFour" TEXT,
    "gatewayResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentValidation_transactionId_key" ON "PaymentValidation"("transactionId");

-- CreateIndex
CREATE INDEX "PaymentValidation_createdAt_idx" ON "PaymentValidation"("createdAt");

-- CreateIndex
CREATE INDEX "PaymentValidation_status_idx" ON "PaymentValidation"("status");
