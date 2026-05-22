-- Merge duplicate driver rows created by the 2026-05 import.
--
-- Why this exists:
-- The import matched existing drivers by phone or exact legal name. Older rows that
-- only had a short display name, such as "Juvel", could not match
-- "Juvel M. Ramos", so the import created a new drv_* row.
--
-- What this does:
-- - Finds imported rows with driverId like drv_%.
-- - Finds existing non-import rows with the same Display Name.
-- - Merges only when that Display Name is unique on both sides.
-- - Keeps the existing driverId so historical references stay stable.
-- - Deletes the imported duplicate row after the merge.
--
-- Ambiguous names, such as multiple Raul rows, are intentionally skipped.

begin;

with imported as (
  select d.*
  from public.drivers d
  where d."driverId" like 'drv\_%' escape '\'
),
existing as (
  select d.*
  from public.drivers d
  where d."driverId" not like 'drv\_%' escape '\'
),
safe_name_matches as (
  select
    e."driverId" as existing_driver_id,
    i."driverId" as imported_driver_id
  from existing e
  join imported i
    on lower(trim(e."driverName")) = lower(trim(i."driverName"))
  where
    trim(coalesce(e."driverName", '')) <> ''
    and (
      select count(*)
      from existing e2
      where lower(trim(e2."driverName")) = lower(trim(e."driverName"))
    ) = 1
    and (
      select count(*)
      from imported i2
      where lower(trim(i2."driverName")) = lower(trim(i."driverName"))
    ) = 1
),
updated as (
  update public.drivers target
  set
    "driverName" = imported."driverName",
    "active" = imported."active",
    "priority" = imported."priority",
    "status" = imported."status",
    "full_name" = imported."full_name",
    "phone_number" = imported."phone_number",
    "driver_notes" = imported."driver_notes",
    "driverNameFull" = imported."driverNameFull",
    "phone" = imported."phone",
    "email" = imported."email",
    "addressLine1" = imported."addressLine1",
    "addressLine2" = imported."addressLine2",
    "city" = imported."city",
    "state" = imported."state",
    "zip" = imported."zip",
    "cdlNumber" = imported."cdlNumber",
    "cdlClass" = imported."cdlClass",
    "cdlState" = imported."cdlState",
    "cdlExpiration" = imported."cdlExpiration",
    "medicalCardExpiration" = imported."medicalCardExpiration",
    "hireDate" = imported."hireDate",
    "dateOfBirth" = imported."dateOfBirth",
    "ssnLast4" = imported."ssnLast4",
    "emergencyContactName" = imported."emergencyContactName",
    "emergencyContactPhone" = imported."emergencyContactPhone",
    "notes" = imported."notes"
  from safe_name_matches matches
  join public.drivers imported
    on imported."driverId" = matches.imported_driver_id
  where target."driverId" = matches.existing_driver_id
  returning
    target."driverId" as kept_driver_id,
    imported."driverId" as duplicate_driver_id,
    target."driverName",
    target."driverNameFull"
),
deleted as (
  delete from public.drivers target
  using updated
  where target."driverId" = updated.duplicate_driver_id
  returning target."driverId" as deleted_driver_id
)
select
  updated.kept_driver_id,
  updated.duplicate_driver_id,
  updated."driverName",
  updated."driverNameFull",
  deleted.deleted_driver_id
from updated
left join deleted
  on deleted.deleted_driver_id = updated.duplicate_driver_id
order by updated."driverName";

commit;

-- Optional: see any imported rows that still need manual review after the merge.
-- These are usually genuinely new drivers or ambiguous short names.
select
  "driverId",
  "driverName",
  "driverNameFull",
  "phone",
  "cdlNumber"
from public.drivers
where "driverId" like 'drv\_%' escape '\'
order by "driverName", "driverNameFull";
