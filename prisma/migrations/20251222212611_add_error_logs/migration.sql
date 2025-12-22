-- CreateTable
CREATE TABLE "public"."error_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "error_type" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "cookies" JSONB,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "url" TEXT,
    "stack_trace" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "error_logs_user_id_idx" ON "public"."error_logs"("user_id");

-- CreateIndex
CREATE INDEX "error_logs_error_type_idx" ON "public"."error_logs"("error_type");

-- CreateIndex
CREATE INDEX "error_logs_created_at_idx" ON "public"."error_logs"("created_at");
