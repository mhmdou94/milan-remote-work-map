# Milan Remote Work Map

A small Next.js app for viewing your own Milan remote-work place list.

The map uses OpenStreetMap tiles as the background, but the available places are only the ones you add manually to a private local CSV file.

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
id,name,category,latitude,longitude,address,remote_work_friendly,wifi,power_outlets,cost,custom_tags,notes,score
```

Example row:

```csv
favorite-cafe,Favorite Cafe,Cafe,45.4642,9.19,"Via Example 1",friendly,on,on,purchase_required,quiet|calls-ok,"Good tables near the window",5
```

## Notes

Supported values: `remote_work_friendly` is `friendly`, `maybe`, or `not_friendly`; `wifi` and `power_outlets` are `on`, `off`, or `unknown`; `cost` is `free`, `purchase_required`, `paid`, or `unknown`. Separate custom tags with `|` inside the `custom_tags` cell.
