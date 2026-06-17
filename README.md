# Milan Remote Work Map

A small Next.js app for a trusted, community-maintained map of laptop-friendly places in Milan.

The map uses OpenStreetMap tiles as the background, but the available places are curated in a local CSV file. The goal is not to list every cafe; it is to help remote workers confidently choose places with usable Wi-Fi, power, seating, hours, and recent trust signals.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data

- Places are read from `data/places.csv` on the server.
- There is no public places API and no public CSV download route.
- To change the list, edit `data/places.csv` manually and refresh the page.
- Map tiles are loaded from OpenStreetMap by Leaflet. The app does not cache OSM tiles.

CSV columns:

```csv
id,name,category,latitude,longitude,address,remote_work_friendly,wifi,power_outlets,cost,custom_tags,notes,score,neighborhood,opening_hours,wifi_quality,outlet_availability,noise_level,seating_comfort,call_friendly,laptop_policy,price_level,toilet_available,outdoor_seating,best_for,badges,verified_by,last_checked,added_by,decision_note,website
```

Example row:

```csv
favorite-cafe,Favorite Cafe,Cafe,45.4642,9.19,"Via Example 1",friendly,on,on,purchase_required,quiet|calls-ok,"Good tables near the window",5,Brera,"Mo-Fr 08:30-18:00",good,some,quiet,good,no,limited,medium,yes,yes,1-2h laptop session,Good Wi-Fi|Quiet,Local contributor,June 2026,Community seed,"Small space, better outside peak hours",https://example.com
```

## Notes

Supported values: `remote_work_friendly` is `friendly`, `maybe`, or `not_friendly`; `wifi` and `power_outlets` are `on`, `off`, or `unknown`; `cost` is `free`, `purchase_required`, `paid`, or `unknown`.

Richer fields use these values: `wifi_quality` and `seating_comfort` are `great`, `good`, `ok`, `poor`, or `unknown`; `outlet_availability` is `many`, `some`, `few`, `none`, or `unknown`; `noise_level` is `quiet`, `medium`, `loud`, or `unknown`; `call_friendly`, `toilet_available`, and `outdoor_seating` are `yes`, `no`, or `unknown`; `laptop_policy` is `welcome`, `limited`, `ask`, `not_allowed`, or `unknown`; `price_level` is `free`, `low`, `medium`, `high`, or `unknown`.

Separate `custom_tags` and `badges` with `|` inside the cell. Keep `opening_hours` in common OpenStreetMap-style day/time ranges like `Mo-Fr 09:00-18:00; Sa-Su off` so hours stay readable and can support future time-based filters.
