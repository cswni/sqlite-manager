# Migrations

Point **Migrations** at a folder of numbered `.sql` files (e.g. `examples/migrations`).

- **Plan** lists files in name order.
- **Apply pending** runs unapplied files inside a transaction and records them in `_sqliteman_migrations`.

Example:

```sql
-- 001_init.sql
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL
);
```
