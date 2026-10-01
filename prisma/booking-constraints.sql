-- Apply AFTER Prisma migrations using the table-owner/migration role (same as rls.sql).
-- Database-level guarantee that one resource (doctor/barber/etc.) can never hold two
-- active bookings whose times overlap, even if two requests race past the app-level check.
-- Ranges are half-open [start, end) so back-to-back appointments (10:00-10:30, 10:30-11:00) are allowed.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_no_overlap;
ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist ("resourceId" WITH =, tsrange("startAt", "endAt", '[)') WITH &&)
  WHERE (status IN ('PENDING', 'CONFIRMED'));
