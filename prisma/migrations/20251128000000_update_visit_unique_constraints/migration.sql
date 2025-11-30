-- Adjust visit unique constraints to scope by resident
DROP INDEX IF EXISTS "Visit_family_user_id_visit_date_visit_time_key";
DROP INDEX IF EXISTS "Visit_family_user_id_visit_date_time_block_key";

CREATE UNIQUE INDEX "Visit_family_user_id_resident_id_visit_date_visit_time_key"
  ON "public"."Visit"("family_user_id", "resident_id", "visit_date", "visit_time");

CREATE UNIQUE INDEX "Visit_family_user_id_resident_id_visit_date_time_block_key"
  ON "public"."Visit"("family_user_id", "resident_id", "visit_date", "time_block");

