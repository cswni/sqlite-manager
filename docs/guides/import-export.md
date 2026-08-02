# Import & export

In **Import/Export**:

- Export a table to **CSV** or **JSON** at a path you choose.
- Import **CSV** into an existing table (headers must match column names).

## Python helpers

For scripting / XLSX:

```bash
python python/utils/csv_export.py --db app.db --table users --out users.csv
python python/utils/xlsx_export.py --db app.db --table users --out users.xlsx  # needs openpyxl
```

CSV import/export also lives in the Go core for the IDE path.
