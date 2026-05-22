-- Optional schema additions for the Fleet & Drivers manager.
-- Run in Supabase SQL editor before using the expanded profile fields.
-- Existing core columns are not recreated here.

alter table public.drivers
  add column if not exists "driverNameFull" text,
  add column if not exists "full_name" text,
  add column if not exists "phone" text,
  add column if not exists "phone_number" text,
  add column if not exists "email" text,
  add column if not exists "addressLine1" text,
  add column if not exists "addressLine2" text,
  add column if not exists "city" text,
  add column if not exists "state" text,
  add column if not exists "zip" text,
  add column if not exists "cdlNumber" text,
  add column if not exists "cdlClass" text,
  add column if not exists "cdlState" text,
  add column if not exists "cdlExpiration" date,
  add column if not exists "medicalCardExpiration" date,
  add column if not exists "hireDate" date,
  add column if not exists "dateOfBirth" date,
  add column if not exists "ssnLast4" text,
  add column if not exists "emergencyContactName" text,
  add column if not exists "emergencyContactPhone" text,
  add column if not exists "driver_notes" text,
  add column if not exists "status" text,
  add column if not exists "notes" text;

alter table public.buses
  add column if not exists "orderNum" integer,
  add column if not exists "vin" text,
  add column if not exists "year" integer,
  add column if not exists "make" text,
  add column if not exists "model" text,
  add column if not exists "color" text,
  add column if not exists "plateNumber" text,
  add column if not exists "plateState" text,
  add column if not exists "registrationExpiration" date,
  add column if not exists "insuranceExpiration" date,
  add column if not exists "capacity" integer,
  add column if not exists "hasLift" boolean,
  add column if not exists "hasSleeper" boolean,
  add column if not exists "liftCapacity" integer,
  add column if not exists "wheelchairCapacity" integer,
  add column if not exists "fuelType" text,
  add column if not exists "mileage" integer,
  add column if not exists "busColor" text,
  add column if not exists "notes" text,
  add column if not exists "status" text;

alter table public.buses
  alter column "orderNum" type integer
  using case
    when nullif(trim("orderNum"::text), '') ~ '^[0-9]+$'
      then trim("orderNum"::text)::integer
    else null
  end;

update public.buses
set "orderNum" = ranked.row_num
from (
  select "busId", row_number() over (order by coalesce("orderNum", 9999), "busName", "busId") as row_num
  from public.buses
) ranked
where public.buses."busId" = ranked."busId"
  and public.buses."orderNum" is null;
