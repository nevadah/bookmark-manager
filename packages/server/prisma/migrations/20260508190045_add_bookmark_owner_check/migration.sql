ALTER TABLE "Bookmark"
ADD CONSTRAINT bookmark_owner_check
CHECK (("userId" IS NOT NULL)::int + ("orgId" IS NOT NULL)::int = 1);
