# Rinkos monitorius

autoplius.lt rinkos stebėjimas: Audi Q7 / Q8, BMW X5, Porsche Cayenne, Mercedes GLE, Dodge Durango, Tesla Model Y (be dyzelių).

- Svetainė: GitHub Pages (šio repo šaknis).
- Robotas: `.github/workflows/robotas.yml` kasdien 22:00 Lietuvos laiku paleidžia `nuskaityk.js`
  (nuskaito autoplius, atnaujina `raw.json`, `det.json`, `istorija.json`, `foto/`), tada `build.js` -> `duomenys.js`.
- Paleisti rankiniu būdu: Actions -> Rinkos monitorius -> Run workflow.
- `zurnalas.txt` — paskutinių paleidimų suvestinė.
