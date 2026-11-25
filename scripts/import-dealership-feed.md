# Uvoz zalihe autokuće

Provjerite lokalni feed bez objavljivanja.

```powershell
npm run import:feed -- --file data/dealership-feed-sample.json --dealer "Probna autokuća" --city "Osijek" --oib "12345678901" --phone "+385 31 123 456" --dry-run
```

Za redoviti uvoz upotrijebite `--url` s javnom HTTPS poveznicom i izostavite `--dry-run`. Zakažite istu naredbu u CI-u ili Windows Task Scheduleru iz korijena repozitorija. Sačuvajte izlaz i tretirajte izlazni kod različit od nule kao neuspjeh sinkronizacije.

- Lokalni uvoz zapisuje `data/imported-listings.json`. Pokrenite `npm run build:site` i objavite novu statičku verziju za prikaz tih zapisa.
- Za trenutnu objavu na projektu koji koristi Supabase, postavite `NEXT_PUBLIC_SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY` u okruženju zadatka. Uvoz traži postojeći račun po OIB-u. Za novi profil uvoza vezan uz postojeći autentificirani račun navedite `--profile-id`.
- Na `/racun` probni uvoz prihvaća datoteku ili HTTPS izvor koji dopušta CORS. Za partnerske izvore bez CORS-a u okruženju Workera postavite `DEALERSHIP_FEED_HOSTS` na popis točnih, javnih imena poslužitelja razdvojenih zarezom. Pregled uvoza prikazuje preskočene zapise i procjenu cijene prije objave.
- Web uvoz čita podatke dostupne u izvornom HTML-u. Iz feeda pošaljite EUR cijenu, identitet vozila, godište, km, snagu, gorivo i mjenjač. Pogledajte izvještaj o preskakanju ako stranica učitava podatke tek nakon otvaranja ili ih izostavlja.

