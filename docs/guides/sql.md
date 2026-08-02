# SQL editor

1. Open a database from Welcome (path or file dialog in desktop).
2. Switch to **SQL** in the activity bar.
3. Write SQLite SQL; press **Run** or **Ctrl/Cmd+Enter**.
4. Results appear in the grid below; non-SELECT statements show change counts.
5. Recent history chips re-run previous statements.

Multi-statement scripts are supported: statements before the last run as `Exec`; if the last statement is a `SELECT`/`WITH`/`PRAGMA`, its rows are returned.
