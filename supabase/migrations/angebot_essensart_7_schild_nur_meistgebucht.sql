-- Mama Mia · Angebot nach Essensart · Teil 7: Schild "Premium" an den Paket-Karten entfernen
-- Nur "Meistgebucht" bleibt als Schild. Das Paket Premium selbst und sein Preis bleiben unverändert.
-- Jana kann das Schild im CRM unter Pakete jederzeit wieder setzen.

update public.pakete
set hinweis = null
where hinweis = 'Premium';
