#!/usr/bin/env python3
"""CSV import helper — optional; Go core already imports CSV natively.
Usage: python csv_import.py --db path.db --table users --file data.csv
"""
from __future__ import annotations

import argparse
import csv
import sqlite3
import sys


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--table", required=True)
    p.add_argument("--file", required=True)
    args = p.parse_args()

    with open(args.file, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            print("no headers", file=sys.stderr)
            return 1
        cols = list(reader.fieldnames)
        placeholders = ",".join("?" for _ in cols)
        q = f'INSERT INTO "{args.table}" ({",".join(f\'"{c}"\' for c in cols)}) VALUES ({placeholders})'
        con = sqlite3.connect(args.db)
        n = 0
        with con:
            for row in reader:
                con.execute(q, [row.get(c) for c in cols])
                n += 1
        print(f"imported {n} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
