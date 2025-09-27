-- CreateIndex
CREATE INDEX "UserToken_user_id_token_type_idx" ON "public"."UserToken"("user_id", "token_type");
