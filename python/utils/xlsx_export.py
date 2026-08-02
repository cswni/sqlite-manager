#!/usr/bin/env python3
"""XLSX export — requires openpyxl (pip install openpyxl).
Usage: python xlsx_export.py --db path.db --table users --out users.xlsx
"""
from __future__ import annotations

import argparse
import sqlite3
import sys


def main() -> int:
    try:
        from openpyxl import Workbook
    except ImportError:
        print("install openpyxl: pip install openpyxl", file=sys.stderr)
        return 1

    p = argparse.ArgumentParser()
    p.add_argument("--db", required=True)
    p.add_argument("--table", required=True)
    p.add_argument("--out", required=True)
    args = p.parse_args()

    con = sqlite3.connect(args.db)
    cur = con.execute(f'SELECT * FROM "{args.table}"')
    cols = [d[0] for d in cur.description]
    wb = Workbook()
    ws = wb.active
    ws.title = args.table[:31]
    ws.append(cols)
    for row in cur.fetchall():
        ws.append(list(row))
    wb.save(args.out)
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
