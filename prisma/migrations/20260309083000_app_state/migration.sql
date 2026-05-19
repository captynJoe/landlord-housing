-- CreateTable
CREATE TABLE "AppState" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppState_key_key" ON "AppState"("key");

-- CreateIndex
CREATE INDEX "AppState_updatedAt_idx" ON "AppState"("updatedAt");
