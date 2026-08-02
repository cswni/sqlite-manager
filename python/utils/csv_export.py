#!/usr/bin/env python3
"""CSV export helper.
Usage: python csv_export.py --db path.db --table users --out users.csv
"""
from __future__ import annotations

import argparse
import csv
import sqlite3


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--table", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    con = sqlite3.connect(args.db)
    cur = con.execute(f'SELECT * FROM "{args.table}"')
    cols = [d[0] for d in cur.description]
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows(cur.fetchall())
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
