-- Adds a source column to qr_scans so we can distinguish NFC taps from QR
-- camera scans. Camera scans land on /qr/<id> with no extra param ('qr'),
-- NFC tags are programmed with /qr/<id>?src=nfc and stored as 'nfc'.
alter table qr_scans
  add column if not exists source text not null default 'qr';

create index if not exists qr_scans_source_idx on qr_scans(source);
