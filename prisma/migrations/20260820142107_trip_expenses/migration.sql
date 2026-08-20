-- CreateTable
CREATE TABLE "TripExpense" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripExpenseShare" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TripExpenseShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripExpense_tripId_createdAt_idx" ON "TripExpense"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "TripExpenseShare_userId_idx" ON "TripExpenseShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TripExpenseShare_expenseId_userId_key" ON "TripExpenseShare"("expenseId", "userId");

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpenseShare" ADD CONSTRAINT "TripExpenseShare_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "TripExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpenseShare" ADD CONSTRAINT "TripExpenseShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
