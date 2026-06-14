-- CreateTable
CREATE TABLE "WishlistReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "reminderDays" INTEGER NOT NULL DEFAULT 7,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "senderName" TEXT NOT NULL DEFAULT 'Your Store',
    "emailSubject" TEXT NOT NULL DEFAULT 'You left something behind ♥',
    "replyTo" TEXT NOT NULL DEFAULT ''
);

-- CreateIndex
CREATE INDEX "WishlistReminder_shop_sentAt_idx" ON "WishlistReminder"("shop", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistReminder_shop_email_key" ON "WishlistReminder"("shop", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
