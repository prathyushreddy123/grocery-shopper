-- CreateTable
CREATE TABLE "RideDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RideBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rideDateId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RideBooking_rideDateId_fkey" FOREIGN KEY ("rideDateId") REFERENCES "RideDate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RideBooking_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RideBooking_rideDateId_householdId_key" ON "RideBooking"("rideDateId", "householdId");
