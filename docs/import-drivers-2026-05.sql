-- ETB driver roster import.
-- Run in Supabase SQL editor after docs/reference-management-schema.sql.
--
-- Notes:
-- - Uses named columns; physical table column order does not matter.
-- - Does not store full SSNs. Only ssnLast4 is imported when present.
-- - Existing rows are matched by phone first, then exact legal/full name.
-- - If phone/full name is missing, a unique Display Name match is used as a
--   fallback so older short-name rows are updated instead of duplicated.
-- - License/medical status and days-left values are intentionally not stored;
--   the app should calculate those from expiration dates.

with imported(
  "driverId",
  "driverName",
  "active",
  "priority",
  "status",
  "full_name",
  "phone_number",
  "driver_notes",
  "driverNameFull",
  "phone",
  "email",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "zip",
  "cdlNumber",
  "cdlClass",
  "cdlState",
  "cdlExpiration",
  "medicalCardExpiration",
  "hireDate",
  "dateOfBirth",
  "ssnLast4",
  "emergencyContactName",
  "emergencyContactPhone",
  "notes"
) as (
  values
  ('drv_agustin_ozuna', 'Agustin', true, 1, 'Full-Time', 'Agustin Ozuna', '956-867-2854', null, 'Agustin Ozuna', '956-867-2854', null, null, null, 'McAllen', 'TX', null, '08159568', null, 'TX', '2028-12-20'::date, '2026-08-26'::date, '2016-01-02'::date, '1975-12-20'::date, null, 'Laura Ozuna', '956-960-3396', null),
  ('drv_alejandro_arredondo', 'Alejandro', true, 2, 'Full-Time', 'Alejandro Arredondo', '956-821-4787', null, 'Alejandro Arredondo', '956-821-4787', null, null, null, 'Alamo', 'TX', null, '14942864', null, 'TX', '2030-03-12'::date, '2026-12-22'::date, '2025-03-12'::date, '1971-03-12'::date, null, 'Heather Arredondo', '956-821-4787', null),
  ('drv_andrew_harvey', 'Andrew', true, 3, 'Full-Time', 'Andrew Harvey', '972-922-1278', null, 'Andrew Harvey', '972-922-1278', null, null, null, 'Pharr', 'TX', null, '14110085', null, 'TX', '2034-07-21'::date, '2027-10-15'::date, '2025-12-05'::date, '1970-07-21'::date, null, 'Daisy Martinez', '956-923-1508', null),
  ('drv_baudelio_morales', 'Baudelio', true, 4, 'Full-Time', 'Baudelio Morales', '956-510-4563', null, 'Baudelio Morales', '956-510-4563', null, null, null, 'Edinburg', 'TX', null, '15992213', null, 'TX', '2032-12-21'::date, '2026-09-30'::date, '2012-05-29'::date, '1973-12-21'::date, null, 'Maria Morales', '956-292-5672', null),
  ('drv_david_hart', 'David', true, 5, 'Full-Time', 'David Hart', '956-270-2437', null, 'David Hart', '956-270-2437', null, null, null, 'McAllen', 'TX', null, '44557572', null, 'TX', '2030-04-06'::date, '2027-01-23'::date, '2024-08-14'::date, '1960-04-06'::date, '9021', 'Alma Hart', '956-651-4110', null),
  ('drv_felipe_pena_jr', 'Felipe', true, 6, 'Full-Time', 'Felipe Peña Jr.', '956-330-5059', null, 'Felipe Peña Jr.', '956-330-5059', null, null, null, 'McAllen', 'TX', null, '09610621', null, 'TX', '2033-09-02'::date, '2027-02-25'::date, '2018-03-09'::date, '1961-09-02'::date, null, 'Alma Pena', '956-878-8852', null),
  ('drv_george_rodriguez', 'George', true, 7, 'Full-Time', 'George Rodriguez', '956-369-2586', '4/7 sent form', 'George Rodriguez', '956-369-2586', null, null, null, 'Edinburg', 'TX', null, '13462347', null, 'TX', '2029-06-04'::date, '2026-05-07'::date, '2021-05-16'::date, '1968-06-04'::date, null, 'Belinda Rodriguez', '956-537-0090', '4/7 sent form'),
  ('drv_griselda_cantu', 'Griselda', true, 8, 'Full-Time', 'Griselda Cantu', '956-313-1313', '4/7 reminded driver to bring forms', 'Griselda Cantu', '956-313-1313', null, null, null, 'Mission', 'TX', null, '1484017', null, 'TX', '2029-08-18'::date, '2026-05-06'::date, null, '1970-08-18'::date, null, 'Diana Esquivel', '956-560-0077', '4/7 reminded driver to bring forms'),
  ('drv_guillermo_yarritu', 'Guillermo', true, 9, 'Full-Time', 'Guillermo Yarritu', '956-521-7103', null, 'Guillermo Yarritu', '956-521-7103', null, null, null, 'Rancho Viejo', 'TX', null, '23459891', null, 'TX', '2033-03-16'::date, '2027-04-24'::date, '2024-11-02'::date, '1974-03-16'::date, null, 'Guillermo A Yarritu', '956-572-1654', null),
  ('drv_hector_escamilla', 'Hector', true, 10, 'Full-Time', 'Hector Escamilla', '956-451-5636', null, 'Hector Escamilla', '956-451-5636', null, null, null, 'McAllen', 'TX', null, '26051505', null, 'TX', '2031-03-06'::date, '2027-03-04'::date, '2019-05-28'::date, '1992-03-06'::date, null, 'Sonia Escamilla', '956-537-9226', null),
  ('drv_ivan_a_rodriguez', 'Ivan', true, 11, 'Full-Time', 'Ivan A. Rodriguez', '956-279-2300', null, 'Ivan A. Rodriguez', '956-279-2300', null, null, null, 'Palmview', 'TX', null, '22739791', null, 'TX', '2031-12-04'::date, '2026-10-30'::date, '2022-05-17'::date, '1986-12-04'::date, null, 'April Rodriguez', '956-360-8187', null),
  ('drv_jay_j_rodriguez', 'Jay', true, 12, 'Full-Time', 'Jay J Rodriguez', '956-283-6297', null, 'Jay J Rodriguez', '956-283-6297', null, null, null, 'Edinburg', 'TX', null, '35924633', null, 'TX', '2033-03-27'::date, '2027-02-21'::date, '2025-03-29'::date, '1993-03-27'::date, null, 'Ester Rodriguez', '956-283-6290', null),
  ('drv_jonathan_mendoza', 'Jonathan', true, 13, 'Full-Time', 'Jonathan Mendoza', '956-353-2548', null, 'Jonathan Mendoza', '956-353-2548', null, null, null, 'Rio Grande City', 'TX', null, '46456413', null, 'TX', '2030-12-11'::date, '2027-08-26'::date, '2025-09-27'::date, '1998-12-11'::date, null, 'Jose Mendoza', '956-735-2264', null),
  ('drv_jorge_garcia', 'Jorge', true, 14, 'Full-Time', 'Jorge Garcia', '956-640-1291', null, 'Jorge Garcia', '956-640-1291', null, null, null, 'San Benito', 'TX', null, '13612395', null, 'TX', '2031-08-17'::date, '2027-04-14'::date, '2023-10-24'::date, '1969-08-17'::date, null, 'Claudia Garcia', '956-521-8142', null),
  ('drv_jose_c_cortinas', 'Jose C', true, 15, 'Full-Time', 'Jose C. Cortinas', '956-330-7888', null, 'Jose C. Cortinas', '956-330-7888', null, null, null, 'Edinburg', 'TX', null, '02390588', null, 'TX', '2030-02-07'::date, '2026-10-28'::date, '2023-01-15'::date, '1948-02-07'::date, null, 'Javier Cortinas', '956-793-1871', null),
  ('drv_jose_luis_sanchez', 'Jose Luis', true, 16, 'Full-Time', 'Jose Luis Sanchez', '956-404-6646', '4/7 sent form', 'Jose Luis Sanchez', '956-404-6646', null, null, null, 'Alton', 'TX', null, '07090093', null, 'TX', '2031-06-28'::date, '2026-05-06'::date, '2013-11-17'::date, '1948-06-28'::date, null, 'Delia Sanchez', '956-800-0833', '4/7 sent form'),
  ('drv_jose_mendoza', 'Jose Mendoza', true, 17, 'Full-Time', 'Jose Mendoza', '956-573-7284', null, 'Jose Mendoza', '956-573-7284', null, null, null, 'Rio Grande City', 'TX', null, '40582860', null, 'TX', '2031-08-09'::date, '2026-12-02'::date, '2025-09-27'::date, '1997-09-09'::date, null, 'Jose Mendoza', '956-735-2264', null),
  ('drv_jose_p_escamilla', 'Jose P', true, 18, 'Full-Time', 'Jose P. Escamilla', '956-217-1372', null, 'Jose P. Escamilla', '956-217-1372', null, null, null, 'McAllen', 'TX', null, '02532943', null, 'TX', '2029-11-11'::date, '2027-01-08'::date, '2002-02-01'::date, '1959-11-11'::date, null, 'Sonia Escamilla', '956-537-9226', null),
  ('drv_juan_bella', 'Juan', true, 19, 'Full-Time', 'Juan Bella', '956-398-8056', null, 'Juan Bella', '956-398-8056', null, null, null, 'Raymondville', 'TX', null, '29510470', null, 'TX', '2032-01-15'::date, '2026-10-30'::date, '2025-05-01'::date, '1986-01-15'::date, null, 'Idalia Solorio', '956-642-6636', null),
  ('drv_julie_ann_galvez', 'Julie', true, 20, 'Full-Time', 'Julie Ann Galvez', '956-713-0272', null, 'Julie Ann Galvez', '956-713-0272', null, null, null, 'Mission', 'TX', null, '06191065', null, 'TX', '2031-07-14'::date, '2027-01-06'::date, '2023-12-29'::date, '1981-07-14'::date, null, 'Griselda Galvez', '956-240-8910', null),
  ('drv_maria_loera', 'Maria', true, 21, 'Full-Time', 'Maria Loera', '956-252-3599', null, 'Maria Loera', '956-252-3599', null, null, null, 'Edinburg', 'TX', null, '36559659', null, 'TX', '2030-09-06'::date, '2028-01-21'::date, '2025-10-21'::date, '1987-09-06'::date, null, 'Hector Jr. L', '956-378-8606', null),
  ('drv_miguel_cantu', 'Miguel', true, 22, 'Full-Time', 'Miguel Cantu', '956-224-7049', '4/7 reminded driver to bring forms', 'Miguel Cantu', '956-224-7049', null, null, null, 'Roma', 'TX', null, '12157538', null, 'TX', '2031-02-07'::date, '2026-04-17'::date, null, '1978-02-07'::date, null, 'Benita Cantu', '956-573-3775', '4/7 reminded driver to bring forms'),
  ('drv_noe_a_alanis', 'Noe', true, 23, 'Full-Time', 'Noe A. Alanis', '512-276-4308', null, 'Noe A. Alanis', '512-276-4308', null, null, null, 'Brownsville', 'TX', null, '07180040', null, 'TX', '2033-01-09'::date, '2026-04-08'::date, '2025-04-23'::date, '1959-01-09'::date, null, 'Felicitas Alanis', '956-254-6496', null),
  ('drv_oscar_hernandez', 'Oscar', true, 24, 'Full-Time', 'Oscar Hernandez', '867-752-5475', null, 'Oscar Hernandez', '867-752-5475', null, null, null, 'Edinburg', 'TX', null, '48652704', null, 'TX', '2031-01-11'::date, '2028-02-03'::date, '2024-02-21'::date, '1969-01-11'::date, null, 'Francisco Hernandez', '956-739-0062', null),
  ('drv_prudenciano_castillo', 'Prudenciano', true, 25, 'Full-Time', 'Prudenciano Castillo', '956-590-9083', null, 'Prudenciano Castillo', '956-590-9083', null, null, null, 'San Benito', 'TX', null, '10704281', null, 'TX', '2033-06-23'::date, '2026-12-01'::date, '2021-10-18'::date, '1954-06-23'::date, null, 'Erick Castillo', '956-266-7678', null),
  ('drv_raul_escamilla', 'Raul', true, 26, 'Full-Time', 'Raul Escamilla', '713-775-4384', null, 'Raul Escamilla', '713-775-4384', null, null, null, 'Hidalgo', 'TX', null, '11917615', null, 'TX', '2029-07-25'::date, '2026-06-02'::date, '2025-09-11'::date, '1964-07-25'::date, null, 'Lubella Escamilla', '956-843-8459', null),
  ('drv_rigoberto_gomez', 'Rigoberto', true, 27, 'Full-Time', 'Rigoberto Gomez', '956-358-6551', null, 'Rigoberto Gomez', '956-358-6551', null, null, null, 'Edinburg', 'TX', null, '13225281', null, 'TX', '2031-12-11'::date, '2026-11-04'::date, '2023-08-30'::date, '1965-12-11'::date, null, 'Graciela Gomez', '956-358-6342', null),
  ('drv_sarah_rocha', 'Sarah', true, 28, 'Full-Time', 'Sarah Rocha', '682-426-9399', null, 'Sarah Rocha', '682-426-9399', null, null, null, 'McAllen', 'TX', null, '19427466', null, 'TX', '2029-11-29'::date, '2026-05-27'::date, '2021-06-09'::date, '1983-11-29'::date, null, 'Janie Garcia', '956-904-1149', null),
  ('drv_luis_morales_gonzalez', 'Luis', true, 29, 'Full-Time', 'Luis Morales Gonzalez', null, null, 'Luis Morales Gonzalez', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null),
  ('drv_raul_padron', 'Raul', true, 30, 'Full-Time', 'Raul Padron', null, null, 'Raul Padron', null, null, null, null, null, null, null, '8316382', null, null, null, null, null, '1973-01-10'::date, null, null, null, null),
  ('drv_juvel_m_ramos', 'Juvel', true, 31, 'Full-Time', 'Juvel M. Ramos', null, null, 'Juvel M. Ramos', null, null, null, null, 'Edinburg', 'TX', null, null, null, null, '2030-06-27'::date, null, null, '1971-06-27'::date, null, null, null, null),
  ('drv_honorio_soto', 'Honorio', true, 32, 'Full-Time', 'Honorio Soto', null, null, 'Honorio Soto', null, null, null, null, null, null, null, '8128502', null, null, '2030-02-26'::date, '2027-02-02'::date, null, '1957-02-26'::date, null, null, null, null)
),
resolved as (
  select
    coalesce(existing."driverId", imported."driverId") as "driverId",
    imported."driverName",
    imported."active",
    imported."priority",
    imported."status",
    imported."full_name",
    imported."phone_number",
    imported."driver_notes",
    imported."driverNameFull",
    imported."phone",
    imported."email",
    imported."addressLine1",
    imported."addressLine2",
    imported."city",
    imported."state",
    imported."zip",
    imported."cdlNumber",
    imported."cdlClass",
    imported."cdlState",
    imported."cdlExpiration",
    imported."medicalCardExpiration",
    imported."hireDate",
    imported."dateOfBirth",
    imported."ssnLast4",
    imported."emergencyContactName",
    imported."emergencyContactPhone",
    imported."notes"
  from imported
  left join lateral (
    select d."driverId"
    from public.drivers d
    where
      (
        imported."phone" is not null
        and imported."phone" <> ''
        and regexp_replace(coalesce(d."phone", d."phone_number", ''), '\D', '', 'g')
          = regexp_replace(imported."phone", '\D', '', 'g')
      )
      or lower(coalesce(d."driverNameFull", d."full_name", '')) = lower(imported."driverNameFull")
      or (
        trim(coalesce(imported."driverName", '')) <> ''
        and lower(trim(d."driverName")) = lower(trim(imported."driverName"))
        and (
          select count(*)
          from public.drivers d2
          where lower(trim(d2."driverName")) = lower(trim(imported."driverName"))
        ) = 1
        and (
          select count(*)
          from imported i2
          where lower(trim(i2."driverName")) = lower(trim(imported."driverName"))
        ) = 1
      )
    order by
      case
        when imported."phone" is not null
          and imported."phone" <> ''
          and regexp_replace(coalesce(d."phone", d."phone_number", ''), '\D', '', 'g')
            = regexp_replace(imported."phone", '\D', '', 'g')
        then 0
        when lower(coalesce(d."driverNameFull", d."full_name", '')) = lower(imported."driverNameFull")
        then 1
        when lower(trim(d."driverName")) = lower(trim(imported."driverName"))
        then 2
        else 3
      end
    limit 1
  ) existing on true
)
insert into public.drivers (
  "driverId",
  "driverName",
  "active",
  "priority",
  "status",
  "full_name",
  "phone_number",
  "driver_notes",
  "driverNameFull",
  "phone",
  "email",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "zip",
  "cdlNumber",
  "cdlClass",
  "cdlState",
  "cdlExpiration",
  "medicalCardExpiration",
  "hireDate",
  "dateOfBirth",
  "ssnLast4",
  "emergencyContactName",
  "emergencyContactPhone",
  "notes"
)
select * from resolved
on conflict ("driverId") do update set
  "driverName" = excluded."driverName",
  "active" = excluded."active",
  "priority" = excluded."priority",
  "status" = excluded."status",
  "full_name" = excluded."full_name",
  "phone_number" = excluded."phone_number",
  "driver_notes" = excluded."driver_notes",
  "driverNameFull" = excluded."driverNameFull",
  "phone" = excluded."phone",
  "email" = excluded."email",
  "addressLine1" = excluded."addressLine1",
  "addressLine2" = excluded."addressLine2",
  "city" = excluded."city",
  "state" = excluded."state",
  "zip" = excluded."zip",
  "cdlNumber" = excluded."cdlNumber",
  "cdlClass" = excluded."cdlClass",
  "cdlState" = excluded."cdlState",
  "cdlExpiration" = excluded."cdlExpiration",
  "medicalCardExpiration" = excluded."medicalCardExpiration",
  "hireDate" = excluded."hireDate",
  "dateOfBirth" = excluded."dateOfBirth",
  "ssnLast4" = excluded."ssnLast4",
  "emergencyContactName" = excluded."emergencyContactName",
  "emergencyContactPhone" = excluded."emergencyContactPhone",
  "notes" = excluded."notes";
