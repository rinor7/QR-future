-- =============================================================
-- Seed 40 test QR cards for rinorsahiti9@gmail.com
-- Mix of fully-filled, partially-filled, and minimal cards.
-- IDs are prefixed with `qr_seed_` so you can wipe them later:
--   delete from contacts where id like 'qr_seed_%';
-- =============================================================

with target_user as (
  select id as user_id from auth.users where lower(email) = 'rinorsahiti9@gmail.com'
)
insert into contacts (
  id, user_id, name, title, company, logo_url,
  phone, email, website,
  linkedin_url, instagram_url, facebook_url,
  pdf_url, address, primary_color, notes, created_by
)
select v.* from target_user, (values

-- ──── Bucket 1: Fully-loaded cards (1–10) ───────────────────────────────────
( 'qr_seed_001', (select user_id from target_user),
  'Markus Weber', 'CEO & Founder', 'Weber Solutions GmbH', '',
  '[{"number":"+41 79 123 45 67","label":"Mobil"},{"number":"+41 44 200 10 20","label":"Büro"}]',
  '[{"email":"markus@webersolutions.ch","label":"Work"},{"email":"m.weber@gmail.com","label":"Privat"}]',
  '[{"url":"https://webersolutions.ch","label":"Website"},{"url":"https://blog.webersolutions.ch","label":"Blog"}]',
  'https://linkedin.com/in/markusweber', 'https://instagram.com/markus.weber', '',
  '', 'Bahnhofstrasse 12, 8001 Zürich', '#1d4ed8', 'Sehr wichtiger Kunde – immer mit Vorname ansprechen.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_002', (select user_id from target_user),
  'Sophie Müller', 'Marketing Director', 'Helvetica Brands AG', '',
  '[{"number":"+41 78 555 12 34","label":"Mobile"}]',
  '[{"email":"sophie.mueller@helvetica-brands.ch","label":"Work"}]',
  '[{"url":"https://helvetica-brands.ch","label":"Website"}]',
  'https://linkedin.com/in/sophiemueller', 'https://instagram.com/sophiem', 'https://facebook.com/sophie.mueller',
  '', 'Limmatstrasse 264, 8005 Zürich', '#dc2626', 'Networking event 2026.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_003', (select user_id from target_user),
  'Daniel Keller', 'Senior Software Engineer', 'TechFlow AG', '',
  '[{"number":"+41 76 234 56 78","label":"Mobile"},{"number":"+41 43 555 22 33","label":"Office"}]',
  '[{"email":"daniel.keller@techflow.ch","label":"Work"}]',
  '[{"url":"https://techflow.ch","label":"Company"},{"url":"https://github.com/dkeller","label":"GitHub"}]',
  'https://linkedin.com/in/danielkeller', '', '',
  '', 'Pfingstweidstrasse 60, 8005 Zürich', '#059669', 'Backend specialist.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_004', (select user_id from target_user),
  'Lisa Schmid', 'Sales Manager', 'NovaTech Solutions', '',
  '[{"number":"+41 79 444 11 22","label":"Mobile"}]',
  '[{"email":"l.schmid@novatech.ch","label":"Work"},{"email":"lisa.schmid@gmail.com","label":"Personal"}]',
  '[{"url":"https://novatech.ch","label":"Website"}]',
  'https://linkedin.com/in/lisaschmid', 'https://instagram.com/lisa.schmid', '',
  '', 'Seestrasse 42, 8002 Zürich', '#7c3aed', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_005', (select user_id from target_user),
  'Thomas Frei', 'CFO', 'Frei & Partner Treuhand', '',
  '[{"number":"+41 44 123 45 67","label":"Office"},{"number":"+41 79 987 65 43","label":"Mobile"}]',
  '[{"email":"thomas.frei@freipartner.ch","label":"Work"}]',
  '[{"url":"https://freipartner.ch","label":"Website"}]',
  'https://linkedin.com/in/thomasfrei', '', 'https://facebook.com/freipartner',
  '', 'Paradeplatz 8, 8001 Zürich', '#0f172a', 'Steuerberater seit 2018.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_006', (select user_id from target_user),
  'Anna Bianchi', 'Creative Director', 'Studio Bianchi', '',
  '[{"number":"+41 78 333 44 55","label":"Mobile"}]',
  '[{"email":"anna@studiobianchi.com","label":"Work"}]',
  '[{"url":"https://studiobianchi.com","label":"Portfolio"},{"url":"https://behance.net/annabianchi","label":"Behance"}]',
  'https://linkedin.com/in/annabianchi', 'https://instagram.com/anna.studio', '',
  '', 'Via Nassa 17, 6900 Lugano', '#ec4899', 'Branding & visual identity.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_007', (select user_id from target_user),
  'Peter Hoffmann', 'Geschäftsführer', 'Hoffmann Bau AG', '',
  '[{"number":"+41 31 555 88 77","label":"Büro"},{"number":"+41 79 111 22 33","label":"Direkt"}]',
  '[{"email":"p.hoffmann@hoffmannbau.ch","label":"Geschäftlich"}]',
  '[{"url":"https://hoffmannbau.ch","label":"Webseite"}]',
  'https://linkedin.com/in/peterhoffmann', '', 'https://facebook.com/hoffmannbau',
  '', 'Industriestrasse 18, 3052 Zollikofen', '#92400e', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_008', (select user_id from target_user),
  'Julia Roth', 'Head of Product', 'PixelLab Studio', '',
  '[{"number":"+41 76 555 99 88","label":"Mobile"}]',
  '[{"email":"julia@pixellab.io","label":"Work"},{"email":"j.roth@gmail.com","label":"Private"}]',
  '[{"url":"https://pixellab.io","label":"Website"}]',
  'https://linkedin.com/in/juliaroth', 'https://instagram.com/julia.roth', '',
  '', 'Europaallee 21, 8004 Zürich', '#0891b2', 'Speaker at Zurich Tech Week.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_009', (select user_id from target_user),
  'Lukas Brunner', 'Real Estate Agent', 'Brunner Immobilien', '',
  '[{"number":"+41 44 777 88 99","label":"Office"},{"number":"+41 79 234 11 22","label":"Mobile"},{"number":"+41 44 777 88 90","label":"Fax"}]',
  '[{"email":"lukas@brunner-immo.ch","label":"Work"}]',
  '[{"url":"https://brunner-immo.ch","label":"Website"}]',
  'https://linkedin.com/in/lukasbrunner', '', 'https://facebook.com/brunnerimmobilien',
  '', 'Bahnhofplatz 1, 6003 Luzern', '#16a34a', 'Spezialisiert auf Wohnimmobilien Innerschweiz.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_010', (select user_id from target_user),
  'Elena Rossi', 'Restaurant Owner', 'Trattoria Da Elena', '',
  '[{"number":"+41 91 922 33 44","label":"Restaurant"}]',
  '[{"email":"elena@trattoria-elena.ch","label":"Reservierungen"}]',
  '[{"url":"https://trattoria-elena.ch","label":"Webseite"},{"url":"https://www.tripadvisor.ch/elena","label":"TripAdvisor"}]',
  '', 'https://instagram.com/trattoria.elena', 'https://facebook.com/trattoriaelena',
  '', 'Piazza Riforma 3, 6900 Lugano', '#b91c1c', 'Authentische italienische Küche.', 'rinorsahiti9@gmail.com'
),

-- ──── Bucket 2: Medium-filled (11–20) ───────────────────────────────────────
( 'qr_seed_011', (select user_id from target_user),
  'Felix Graf', 'Architect', 'Graf Architekten', '',
  '[{"number":"+41 44 333 22 11","label":"Office"}]',
  '[{"email":"felix@graf-arch.ch","label":"Work"}]',
  '[{"url":"https://graf-arch.ch","label":"Website"}]',
  'https://linkedin.com/in/felixgraf', '', '',
  '', '', '#2563eb', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_012', (select user_id from target_user),
  'Nadine Vogel', 'HR Specialist', 'TalentBridge GmbH', '',
  '[{"number":"+41 79 666 77 88","label":"Mobile"}]',
  '[{"email":"nadine.vogel@talentbridge.ch","label":"Work"}]',
  '',
  'https://linkedin.com/in/nadinevogel', '', '',
  '', 'Talstrasse 70, 8001 Zürich', '#2563eb', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_013', (select user_id from target_user),
  'Christian Berger', 'Photographer', 'Berger Photography', '',
  '[{"number":"+41 78 888 99 00","label":"Mobile"}]',
  '[{"email":"hello@bergerphoto.ch","label":"Bookings"}]',
  '[{"url":"https://bergerphoto.ch","label":"Portfolio"}]',
  '', 'https://instagram.com/bergerphoto', '',
  '', '', '#0f172a', 'Hochzeits- & Eventfotografie.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_014', (select user_id from target_user),
  'Sandra Egli', 'Yoga Instructor', 'OmStudio Zürich', '',
  '[{"number":"+41 76 222 33 44","label":"Mobile"}]',
  '[{"email":"sandra@omstudio.ch","label":"Studio"}]',
  '[{"url":"https://omstudio.ch","label":"Website"}]',
  '', 'https://instagram.com/sandra.yoga', '',
  '', 'Lagerstrasse 102, 8004 Zürich', '#a855f7', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_015', (select user_id from target_user),
  'Michael Steiner', 'Lawyer', 'Steiner Rechtsanwälte', '',
  '[{"number":"+41 44 552 99 11","label":"Kanzlei"}]',
  '[{"email":"m.steiner@steiner-law.ch","label":"Kanzlei"}]',
  '[{"url":"https://steiner-law.ch","label":"Webseite"}]',
  'https://linkedin.com/in/michaelsteiner', '', '',
  '', 'Bahnhofstrasse 100, 8001 Zürich', '#1e3a8a', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_016', (select user_id from target_user),
  'Carla Zanetti', 'Personal Trainer', 'FitLife Studio', '',
  '[{"number":"+41 79 555 33 22","label":"Mobile"}]',
  '[{"email":"carla@fitlife.ch","label":"Work"}]',
  '[{"url":"https://fitlife.ch","label":"Website"}]',
  '', 'https://instagram.com/carla.fitlife', '',
  '', '', '#f59e0b', 'PT-Slots Mo–Fr 6–20 Uhr.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_017', (select user_id from target_user),
  'Benjamin Suter', 'DJ / Music Producer', 'Suter Sounds', '',
  '[{"number":"+41 78 444 55 66","label":"Bookings"}]',
  '[{"email":"booking@sutersounds.ch","label":"Bookings"}]',
  '[{"url":"https://soundcloud.com/sutersounds","label":"SoundCloud"}]',
  '', 'https://instagram.com/sutersounds', '',
  '', '', '#7c3aed', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_018', (select user_id from target_user),
  'Martina Lang', 'Coach', 'Mindset Lab', '',
  '[{"number":"+41 79 222 11 33","label":"Mobile"}]',
  '[{"email":"martina@mindsetlab.ch","label":"Coaching"}]',
  '[{"url":"https://mindsetlab.ch","label":"Website"}]',
  'https://linkedin.com/in/martinalang', '', '',
  '', '', '#10b981', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_019', (select user_id from target_user),
  'Robert Maier', 'Mechanic', 'Maier Garage', '',
  '[{"number":"+41 44 999 88 77","label":"Werkstatt"}]',
  '',
  '[{"url":"https://maier-garage.ch","label":"Webseite"}]',
  '', '', 'https://facebook.com/maiergarage',
  '', 'Industriestrasse 5, 8302 Kloten', '#dc2626', 'Mo–Fr 7:30–18:00.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_020', (select user_id from target_user),
  'Verena Häusermann', 'Therapist', 'Praxis Häusermann', '',
  '[{"number":"+41 44 111 22 33","label":"Praxis"}]',
  '[{"email":"info@praxis-haeusermann.ch","label":"Termine"}]',
  '',
  '', '', '',
  '', 'Seefeldstrasse 215, 8008 Zürich', '#0891b2', '', 'rinorsahiti9@gmail.com'
),

-- ──── Bucket 3: Minimal cards (21–30) ───────────────────────────────────────
( 'qr_seed_021', (select user_id from target_user),
  'Tim Becker', 'Freelancer', '', '',
  '[{"number":"+41 78 123 11 22","label":"Mobile"}]',
  '', '', '', '', '', '', '', '#2563eb', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_022', (select user_id from target_user),
  'Laura Pfister', '', '', '',
  '',
  '[{"email":"laura.pfister@gmail.com","label":"Email"}]',
  '', '', '', '', '', '', '#2563eb', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_023', (select user_id from target_user),
  'Marco Renz', 'Consultant', '', '',
  '[{"number":"+41 79 444 22 11","label":"Mobile"}]',
  '[{"email":"marco@renz.ch","label":"Work"}]',
  '', '', '', '', '', '', '#2563eb', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_024', (select user_id from target_user),
  'Eva Fischer', '', 'Fischer Design', '',
  '',
  '[{"email":"eva@fischer-design.ch","label":"Work"}]',
  '[{"url":"https://fischer-design.ch","label":"Website"}]',
  '', '', '', '', '', '#ec4899', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_025', (select user_id from target_user),
  'Jonas Wirth', 'Photographer', '', '',
  '',
  '',
  '[{"url":"https://jonaswirth.com","label":"Portfolio"}]',
  '', 'https://instagram.com/jonas.wirth', '', '', '', '#0f172a', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_026', (select user_id from target_user),
  'Andrea Zürcher', 'Student', '', '',
  '[{"number":"+41 78 999 11 22","label":"Mobile"}]',
  '[{"email":"andrea.zuercher@uzh.ch","label":"University"}]',
  '', '', '', '', '', '', '#2563eb', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_027', (select user_id from target_user),
  'David Eberhard', '', '', '',
  '[{"number":"+41 79 333 11 44","label":"Mobile"}]',
  '', '', '', '', '', '', '', '#2563eb', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_028', (select user_id from target_user),
  '', '', 'Café Ritual', '',
  '[{"number":"+41 44 555 11 99","label":"Café"}]',
  '',
  '[{"url":"https://caferitual.ch","label":"Website"}]',
  '', 'https://instagram.com/caferitual', '',
  '', 'Seefeldstrasse 88, 8008 Zürich', '#92400e', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_029', (select user_id from target_user),
  'Mia Keller', 'Designer', 'Studio Keller', '',
  '', '', '', '', 'https://instagram.com/studiokeller', '',
  '', '', '#f43f5e', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_030', (select user_id from target_user),
  'Alex Bühler', 'CEO', 'Bühler Tech', '',
  '[{"number":"+41 79 100 200 30","label":"Mobile"}]',
  '[{"email":"alex@buhler-tech.ch","label":"Work"}]',
  '', 'https://linkedin.com/in/alexbuhler', '', '', '', '', '#2563eb', '', 'rinorsahiti9@gmail.com'
),

-- ──── Bucket 4: Edge cases (31–40) ──────────────────────────────────────────
( 'qr_seed_031', (select user_id from target_user),
  'Fatima Al-Hassan', 'International Sales', 'GlobalLink AG', '',
  '[{"number":"+41 44 111 99 88","label":"CH"},{"number":"+971 50 123 4567","label":"UAE"},{"number":"+1 415 555 0100","label":"USA"}]',
  '[{"email":"fatima@globallink.ch","label":"Primary"},{"email":"f.alhassan@globallink.ae","label":"UAE Office"}]',
  '[{"url":"https://globallink.ch","label":"Global"},{"url":"https://globallink.ae","label":"UAE"}]',
  'https://linkedin.com/in/fatima-alhassan', '', '',
  '', 'Talstrasse 11, 8001 Zürich', '#7c3aed', 'Multi-region contact – check timezone before calling.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_032', (select user_id from target_user),
  'René Dubois', 'Vintner', 'Domaine Dubois', '',
  '[{"number":"+41 21 555 22 11","label":"Domaine"}]',
  '[{"email":"rene@dubois-wine.ch","label":"Sales"}]',
  '[{"url":"https://dubois-wine.ch","label":"Webseite"}]',
  '', 'https://instagram.com/dubois.wine', 'https://facebook.com/dubois.wine',
  '', 'Route du Lavaux 12, 1096 Cully', '#7c2d12', 'Bio-Weingut seit 1985.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_033', (select user_id from target_user),
  'Hans-Peter Müller-Schmidt', 'Doppelter Doktor & Senior Berater', 'Müller-Schmidt Consulting', '',
  '[{"number":"+41 44 555 11 22","label":"Office"}]',
  '[{"email":"h.mueller-schmidt@ms-consulting.ch","label":"Work"}]',
  '', 'https://linkedin.com/in/hpms', '', '', '', '', '#1e3a8a', '', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_034', (select user_id from target_user),
  '李明 (Li Ming)', 'CTO', 'AsiaConnect Ltd', '',
  '[{"number":"+852 9123 4567","label":"HK"}]',
  '[{"email":"liming@asiaconnect.com","label":"Work"}]',
  '[{"url":"https://asiaconnect.com","label":"Website"}]',
  'https://linkedin.com/in/liming', '', '',
  '', 'Hong Kong', '#dc2626', 'Bridges APAC and EU teams.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_035', (select user_id from target_user),
  'Sarah O''Brien', 'Marketing Lead', 'O''Brien & Co.', '',
  '[{"number":"+353 1 234 5678","label":"Dublin"}]',
  '[{"email":"sarah@obrien-co.ie","label":"Work"}]',
  '[{"url":"https://obrien-co.ie","label":"Website"}]',
  'https://linkedin.com/in/sarah-obrien', 'https://instagram.com/obrien.co', '',
  '', '12 Grafton Street, Dublin 2, Ireland', '#16a34a', 'Apostrophes in name & company – good test.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_036', (select user_id from target_user),
  'Vintage Vinyl', '', '', '',
  '[{"number":"+41 44 222 33 44","label":"Shop"}]',
  '',
  '[{"url":"https://vintagevinyl.ch","label":"Shop"}]',
  '', 'https://instagram.com/vintagevinyl.zh', '',
  '', 'Langstrasse 95, 8004 Zürich', '#0f172a', 'Card without a person — brand only.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_037', (select user_id from target_user),
  'Tobias Imhof', 'Photographer & Videographer', 'Imhof Studio', '',
  '[{"number":"+41 78 111 22 33","label":"Mobile"}]',
  '[{"email":"tobias@imhof.studio","label":"Bookings"}]',
  '[{"url":"https://imhof.studio","label":"Portfolio"},{"url":"https://vimeo.com/imhof","label":"Vimeo"},{"url":"https://youtube.com/@imhof","label":"YouTube"}]',
  '', 'https://instagram.com/imhof.studio', '',
  '', '', '#000000', 'Tests three websites at once.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_038', (select user_id from target_user),
  'Pop-Up Bakery', '', 'Sweet Tooth Co.', '',
  '',
  '[{"email":"hello@sweettooth.ch","label":"Hi"}]',
  '[{"url":"https://sweettooth.ch","label":"Bestellungen"}]',
  '', 'https://instagram.com/sweettooth.zh', 'https://facebook.com/sweettoothzh',
  '', '', '#ec4899', 'No phone — orders only via web/IG.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_039', (select user_id from target_user),
  'Test User Long Name For Layout Verification', 'Very Long Job Title To Test Truncation Behaviour Across Cards', 'Extremely Long Company Name AG & Partners', '',
  '[{"number":"+41 79 000 00 00","label":"Mobile"}]',
  '[{"email":"verylongemailaddressforlayouttests@example-domain-name.ch","label":"Work"}]',
  '[{"url":"https://this-is-a-rather-long-domain-name-for-testing.example.com","label":"Sehr lange Bezeichnung"}]',
  'https://linkedin.com/in/test', '', '', '', '', '#2563eb', 'For UI overflow / truncation testing.', 'rinorsahiti9@gmail.com'
),
( 'qr_seed_040', (select user_id from target_user),
  'Special Chars: ä ö ü é à ñ €', 'Spëcial Tïtle 100%', 'Café & Bar « Étoile »', '',
  '[{"number":"+41 44 100 200 30","label":"Café"}]',
  '[{"email":"info@etoile.ch","label":"Reservierungen"}]',
  '[{"url":"https://etoile.ch","label":"Website"}]',
  '', 'https://instagram.com/etoile.zh', '',
  '', 'Niederdorfstrasse 12, 8001 Zürich', '#b91c1c', 'Tests Unicode + special chars across all fields.', 'rinorsahiti9@gmail.com'
)

) as v(id, user_id, name, title, company, logo_url,
       phone, email, website,
       linkedin_url, instagram_url, facebook_url,
       pdf_url, address, primary_color, notes, created_by)
on conflict (id) do nothing;
