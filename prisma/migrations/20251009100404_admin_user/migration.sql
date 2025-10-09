-- DropForeignKey
ALTER TABLE "public"."custom_events" DROP CONSTRAINT "custom_events_created_by_fkey";

-- CreateTable
CREATE TABLE "users"."admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "users"."admin_users"("email");

-- AddForeignKey
ALTER TABLE "public"."custom_events" ADD CONSTRAINT "custom_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"."admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
