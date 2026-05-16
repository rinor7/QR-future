-- Add address columns to qr_templates so company address can be saved
-- in a template (and applied to every QR card built from that template).
alter table qr_templates add column if not exists street     text default null;
alter table qr_templates add column if not exists street_nr  text default null;
alter table qr_templates add column if not exists plz        text default null;
alter table qr_templates add column if not exists city       text default null;
alter table qr_templates add column if not exists country    text default null;
