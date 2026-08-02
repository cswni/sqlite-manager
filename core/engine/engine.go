package engine

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"
)

type Engine struct {
	mu          sync.RWMutex
	conns       map[string]*sql.DB
	paths       map[string]string
	history     []HistoryEntry
	historyPath string
}

type HistoryEntry struct {
	ID        string    `json:"id"`
	ConnID    string    `json:"connId"`
	SQL       string    `json:"sql"`
	OK        bool      `json:"ok"`
	Ms        int64     `json:"ms"`
	At        time.Time `json:"at"`
	Error     string    `json:"error,omitempty"`
	RowCount  int       `json:"rowCount,omitempty"`
}

type Column struct {
	Name       string `json:"name"`
	Type       string `json:"type"`
	NotNull    bool   `json:"notNull"`
	Default    *string `json:"default,omitempty"`
	PrimaryKey bool   `json:"primaryKey"`
	CID        int    `json:"cid"`
}

type ForeignKey struct {
	ID       int    `json:"id"`
	Seq      int    `json:"seq"`
	Table    string `json:"table"`
	From     string `json:"from"`
	To       string `json:"to"`
	OnUpdate string `json:"onUpdate"`
	OnDelete string `json:"onDelete"`
}

type IndexInfo struct {
	Name   string   `json:"name"`
	Unique bool     `json:"unique"`
	Origin string   `json:"origin"`
	Cols   []string `json:"cols"`
}

type TableSchema struct {
	Name    string       `json:"name"`
	Type    string       `json:"type"` // table | view
	SQL     string       `json:"sql,omitempty"`
	Columns []Column     `json:"columns"`
	Indexes []IndexInfo  `json:"indexes"`
	FKs     []ForeignKey `json:"foreignKeys"`
}

type SchemaResult struct {
	Tables []TableSchema `json:"tables"`
}

type QueryResult struct {
	Columns  []string        `json:"columns"`
	Rows     [][]any         `json:"rows"`
	RowCount int             `json:"rowCount"`
	Ms       int64           `json:"ms"`
	Changes  int64           `json:"changes,omitempty"`
	LastID   int64           `json:"lastInsertId,omitempty"`
}

func New() *Engine {
	home, _ := os.UserHomeDir()
	hp := filepath.Join(home, ".sqliteman", "history.json")
	e := &Engine{
		conns:       map[string]*sql.DB{},
		paths:       map[string]string{},
		historyPath: hp,
	}
	e.loadHistory()
	return e
}

func (e *Engine) Open(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil && !os.IsExist(err) {
		// create only if parent missing for new DBs in existing dirs
	}
	db, err := sql.Open("sqlite", abs)
	if err != nil {
		return "", err
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return "", err
	}
	_, _ = db.Exec(`PRAGMA foreign_keys = ON`)
	id := fmt.Sprintf("c%d", time.Now().UnixNano())
	e.mu.Lock()
	e.conns[id] = db
	e.paths[id] = abs
	e.mu.Unlock()
	return id, nil
}

func (e *Engine) Create(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if _, err := os.Stat(abs); err == nil {
		return "", fmt.Errorf("file already exists: %s", abs)
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		return "", err
	}
	f, err := os.Create(abs)
	if err != nil {
		return "", err
	}
	_ = f.Close()
	return e.Open(abs)
}

func (e *Engine) Close(connID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	db, ok := e.conns[connID]
	if !ok {
		return fmt.Errorf("unknown connection %s", connID)
	}
	delete(e.conns, connID)
	delete(e.paths, connID)
	return db.Close()
}

func (e *Engine) ListConnections() []map[string]string {
	e.mu.RLock()
	defer e.mu.RUnlock()
	out := make([]map[string]string, 0, len(e.paths))
	for id, p := range e.paths {
		out = append(out, map[string]string{"id": id, "path": p})
	}
	sort.Slice(out, func(i, j int) bool { return out[i]["path"] < out[j]["path"] })
	return out
}

func (e *Engine) db(connID string) (*sql.DB, error) {
	e.mu.RLock()
	defer e.mu.RUnlock()
	db, ok := e.conns[connID]
	if !ok {
		return nil, fmt.Errorf("unknown connection %s", connID)
	}
	return db, nil
}

func (e *Engine) Schema(connID string) (*SchemaResult, error) {
	db, err := e.db(connID)
	if err != nil {
		return nil, err
	}
	rows, err := db.Query(`
		SELECT name, type, sql FROM sqlite_master
		WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
		ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []TableSchema
	for rows.Next() {
		var t TableSchema
		var sqlPtr sql.NullString
		if err := rows.Scan(&t.Name, &t.Type, &sqlPtr); err != nil {
			return nil, err
		}
		if sqlPtr.Valid {
			t.SQL = sqlPtr.String
		}
		cols, err := e.columns(db, t.Name)
		if err != nil {
			return nil, err
		}
		if cols == nil {
			cols = []Column{}
		}
		t.Columns = cols
		idxs, err := e.indexes(db, t.Name)
		if err != nil {
			return nil, err
		}
		if idxs == nil {
			idxs = []IndexInfo{}
		}
		t.Indexes = idxs
		fks, err := e.fks(db, t.Name)
		if err != nil {
			return nil, err
		}
		if fks == nil {
			fks = []ForeignKey{}
		}
		t.FKs = fks
		tables = append(tables, t)
	}
	return &SchemaResult{Tables: tables}, rows.Err()
}

func (e *Engine) columns(db *sql.DB, table string) ([]Column, error) {
	rows, err := db.Query(fmt.Sprintf(`PRAGMA table_info(%s)`, quoteIdent(table)))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Column
	for rows.Next() {
		var c Column
		var dflt sql.NullString
		var pk, notnull int
		if err := rows.Scan(&c.CID, &c.Name, &c.Type, &notnull, &dflt, &pk); err != nil {
			return nil, err
		}
		c.NotNull = notnull != 0
		c.PrimaryKey = pk != 0
		if dflt.Valid {
			s := dflt.String
			c.Default = &s
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (e *Engine) indexes(db *sql.DB, table string) ([]IndexInfo, error) {
	rows, err := db.Query(fmt.Sprintf(`PRAGMA index_list(%s)`, quoteIdent(table)))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []IndexInfo
	for rows.Next() {
		var seq int
		var name, origin string
		var unique, partial int
		if err := rows.Scan(&seq, &name, &unique, &origin, &partial); err != nil {
			return nil, err
		}
		info := IndexInfo{Name: name, Unique: unique != 0, Origin: origin}
		ci, err := db.Query(fmt.Sprintf(`PRAGMA index_info(%s)`, quoteIdent(name)))
		if err != nil {
			return nil, err
		}
		for ci.Next() {
			var seqno, cid int
			var col sql.NullString
			if err := ci.Scan(&seqno, &cid, &col); err != nil {
				ci.Close()
				return nil, err
			}
			if col.Valid {
				info.Cols = append(info.Cols, col.String)
			}
		}
		ci.Close()
		out = append(out, info)
	}
	return out, rows.Err()
}

func (e *Engine) fks(db *sql.DB, table string) ([]ForeignKey, error) {
	rows, err := db.Query(fmt.Sprintf(`PRAGMA foreign_key_list(%s)`, quoteIdent(table)))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ForeignKey
	for rows.Next() {
		var fk ForeignKey
		var match string
		if err := rows.Scan(&fk.ID, &fk.Seq, &fk.Table, &fk.From, &fk.To, &fk.OnUpdate, &fk.OnDelete, &match); err != nil {
			return nil, err
		}
		out = append(out, fk)
	}
	return out, rows.Err()
}

func (e *Engine) Query(connID, sqlText string, args []any, limit int) (*QueryResult, error) {
	db, err := e.db(connID)
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 1000
	}
	start := time.Now()
	stmts := splitSQL(sqlText)
	if len(stmts) == 0 {
		return &QueryResult{Columns: []string{}, Rows: [][]any{}, Ms: 0}, nil
	}

	// ponytail: run prior statements with Exec; return last if it is a result-set query
	var totalChanges int64
	var lastID int64
	for i, stmt := range stmts[:len(stmts)-1] {
		res, err := db.Exec(stmt)
		if err != nil {
			ms := time.Since(start).Milliseconds()
			e.addHistory(connID, sqlText, false, ms, fmt.Sprintf("stmt %d: %v", i+1, err), 0)
			return nil, err
		}
		if ch, err := res.RowsAffected(); err == nil {
			totalChanges += ch
		}
		if lid, err := res.LastInsertId(); err == nil {
			lastID = lid
		}
	}

	last := stmts[len(stmts)-1]
	upper := strings.ToUpper(strings.TrimSpace(last))
	isQuery := strings.HasPrefix(upper, "SELECT") || strings.HasPrefix(upper, "WITH") ||
		strings.HasPrefix(upper, "PRAGMA") || strings.HasPrefix(upper, "EXPLAIN") ||
		strings.HasPrefix(upper, "VALUES")

	if !isQuery {
		res, err := db.Exec(last, args...)
		ms := time.Since(start).Milliseconds()
		if err != nil {
			e.addHistory(connID, sqlText, false, ms, err.Error(), 0)
			return nil, err
		}
		ch, _ := res.RowsAffected()
		lid, _ := res.LastInsertId()
		totalChanges += ch
		if lid != 0 {
			lastID = lid
		}
		e.addHistory(connID, sqlText, true, ms, "", int(totalChanges))
		return &QueryResult{Columns: []string{}, Rows: [][]any{}, RowCount: 0, Ms: ms, Changes: totalChanges, LastID: lastID}, nil
	}

	rows, err := db.Query(last, args...)
	ms := time.Since(start).Milliseconds()
	if err != nil {
		e.addHistory(connID, sqlText, false, ms, err.Error(), 0)
		return nil, err
	}
	defer rows.Close()
	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}
	var outRows [][]any
	for rows.Next() {
		if len(outRows) >= limit {
			break
		}
		raw := make([]any, len(cols))
		ptrs := make([]any, len(cols))
		for i := range raw {
			ptrs[i] = &raw[i]
		}
		if err := rows.Scan(ptrs...); err != nil {
			return nil, err
		}
		row := make([]any, len(cols))
		for i, v := range raw {
			row[i] = normalize(v)
		}
		outRows = append(outRows, row)
	}
	e.addHistory(connID, sqlText, true, ms, "", len(outRows))
	return &QueryResult{Columns: cols, Rows: outRows, RowCount: len(outRows), Ms: ms, Changes: totalChanges, LastID: lastID}, rows.Err()
}

// splitSQL splits on semicolons outside quotes. Ceiling: no dollar-quoting / nested comments.
func splitSQL(s string) []string {
	var out []string
	var b strings.Builder
	inSingle, inDouble := false, false
	for i := 0; i < len(s); i++ {
		c := s[i]
		switch {
		case c == '\'' && !inDouble:
			inSingle = !inSingle
			b.WriteByte(c)
		case c == '"' && !inSingle:
			inDouble = !inDouble
			b.WriteByte(c)
		case c == ';' && !inSingle && !inDouble:
			if t := strings.TrimSpace(b.String()); t != "" {
				out = append(out, t)
			}
			b.Reset()
		default:
			b.WriteByte(c)
		}
	}
	if t := strings.TrimSpace(b.String()); t != "" {
		out = append(out, t)
	}
	return out
}

func (e *Engine) TableRows(connID, table string, offset, limit int, where string) (*QueryResult, error) {
	if limit <= 0 {
		limit = 100
	}
	q := fmt.Sprintf(`SELECT * FROM %s`, quoteIdent(table))
	if strings.TrimSpace(where) != "" {
		q += ` WHERE ` + where
	}
	q += fmt.Sprintf(` LIMIT %d OFFSET %d`, limit, offset)
	return e.Query(connID, q, nil, limit)
}

func (e *Engine) UpdateCell(connID, table, pkCol string, pkVal any, col string, val any) error {
	db, err := e.db(connID)
	if err != nil {
		return err
	}
	q := fmt.Sprintf(`UPDATE %s SET %s = ? WHERE %s = ?`, quoteIdent(table), quoteIdent(col), quoteIdent(pkCol))
	_, err = db.Exec(q, val, pkVal)
	return err
}

func (e *Engine) SchemaApply(connID, ddl string) error {
	db, err := e.db(connID)
	if err != nil {
		return err
	}
	_, err = db.Exec(ddl)
	return err
}

func (e *Engine) MigratePlan(dir string) ([]map[string]any, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var files []string
	for _, en := range entries {
		if !en.IsDir() && strings.HasSuffix(strings.ToLower(en.Name()), ".sql") {
			files = append(files, en.Name())
		}
	}
	sort.Strings(files)
	var plan []map[string]any
	for _, f := range files {
		b, err := os.ReadFile(filepath.Join(dir, f))
		if err != nil {
			return nil, err
		}
		plan = append(plan, map[string]any{"file": f, "sql": string(b)})
	}
	return plan, nil
}

func (e *Engine) MigrateApply(connID, dir string) ([]map[string]any, error) {
	db, err := e.db(connID)
	if err != nil {
		return nil, err
	}
	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS _sqliteman_migrations (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		filename TEXT NOT NULL UNIQUE,
		applied_at TEXT NOT NULL
	)`)
	if err != nil {
		return nil, err
	}
	plan, err := e.MigratePlan(dir)
	if err != nil {
		return nil, err
	}
	var applied []map[string]any
	for _, step := range plan {
		fn := step["file"].(string)
		var exists int
		if err := db.QueryRow(`SELECT COUNT(1) FROM _sqliteman_migrations WHERE filename = ?`, fn).Scan(&exists); err != nil {
			return applied, err
		}
		if exists > 0 {
			continue
		}
		sqlText := step["sql"].(string)
		tx, err := db.Begin()
		if err != nil {
			return applied, err
		}
		if _, err := tx.Exec(sqlText); err != nil {
			_ = tx.Rollback()
			return applied, fmt.Errorf("%s: %w", fn, err)
		}
		if _, err := tx.Exec(`INSERT INTO _sqliteman_migrations(filename, applied_at) VALUES (?, ?)`, fn, time.Now().UTC().Format(time.RFC3339)); err != nil {
			_ = tx.Rollback()
			return applied, err
		}
		if err := tx.Commit(); err != nil {
			return applied, err
		}
		applied = append(applied, map[string]any{"file": fn, "status": "applied"})
	}
	return applied, nil
}

func (e *Engine) ExportCSV(connID, table, outPath string) error {
	res, err := e.Query(connID, fmt.Sprintf(`SELECT * FROM %s`, quoteIdent(table)), nil, 1_000_000)
	if err != nil {
		return err
	}
	f, err := os.Create(outPath)
	if err != nil {
		return err
	}
	defer f.Close()
	w := csv.NewWriter(f)
	if err := w.Write(res.Columns); err != nil {
		return err
	}
	for _, row := range res.Rows {
		rec := make([]string, len(row))
		for i, v := range row {
			if v == nil {
				rec[i] = ""
			} else {
				rec[i] = fmt.Sprint(v)
			}
		}
		if err := w.Write(rec); err != nil {
			return err
		}
	}
	w.Flush()
	return w.Error()
}

func (e *Engine) ImportCSV(connID, table, inPath string) (int, error) {
	db, err := e.db(connID)
	if err != nil {
		return 0, err
	}
	f, err := os.Open(inPath)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	r := csv.NewReader(f)
	headers, err := r.Read()
	if err != nil {
		return 0, err
	}
	placeholders := make([]string, len(headers))
	cols := make([]string, len(headers))
	for i, h := range headers {
		cols[i] = quoteIdent(h)
		placeholders[i] = "?"
	}
	q := fmt.Sprintf(`INSERT INTO %s (%s) VALUES (%s)`, quoteIdent(table), strings.Join(cols, ","), strings.Join(placeholders, ","))
	tx, err := db.Begin()
	if err != nil {
		return 0, err
	}
	stmt, err := tx.Prepare(q)
	if err != nil {
		_ = tx.Rollback()
		return 0, err
	}
	defer stmt.Close()
	n := 0
	for {
		rec, err := r.Read()
		if err != nil {
			break
		}
		args := make([]any, len(rec))
		for i, v := range rec {
			args[i] = v
		}
		if _, err := stmt.Exec(args...); err != nil {
			_ = tx.Rollback()
			return n, err
		}
		n++
	}
	return n, tx.Commit()
}

func (e *Engine) ExportJSON(connID, table, outPath string) error {
	res, err := e.Query(connID, fmt.Sprintf(`SELECT * FROM %s`, quoteIdent(table)), nil, 1_000_000)
	if err != nil {
		return err
	}
	objs := make([]map[string]any, 0, len(res.Rows))
	for _, row := range res.Rows {
		m := map[string]any{}
		for i, c := range res.Columns {
			m[c] = row[i]
		}
		objs = append(objs, m)
	}
	b, err := json.MarshalIndent(objs, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(outPath, b, 0o644)
}

func (e *Engine) HistoryList(limit int) []HistoryEntry {
	e.mu.RLock()
	defer e.mu.RUnlock()
	if limit <= 0 || limit > len(e.history) {
		limit = len(e.history)
	}
	start := len(e.history) - limit
	if start < 0 {
		start = 0
	}
	out := make([]HistoryEntry, limit)
	copy(out, e.history[start:])
	// newest first
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	return out
}

func (e *Engine) addHistory(connID, sqlText string, ok bool, ms int64, errMsg string, rows int) {
	entry := HistoryEntry{
		ID:       fmt.Sprintf("h%d", time.Now().UnixNano()),
		ConnID:   connID,
		SQL:      sqlText,
		OK:       ok,
		Ms:       ms,
		At:       time.Now().UTC(),
		Error:    errMsg,
		RowCount: rows,
	}
	e.mu.Lock()
	e.history = append(e.history, entry)
	if len(e.history) > 500 {
		e.history = e.history[len(e.history)-500:]
	}
	e.mu.Unlock()
	e.saveHistory()
}

func (e *Engine) loadHistory() {
	b, err := os.ReadFile(e.historyPath)
	if err != nil {
		return
	}
	_ = json.Unmarshal(b, &e.history)
}

func (e *Engine) saveHistory() {
	_ = os.MkdirAll(filepath.Dir(e.historyPath), 0o755)
	e.mu.RLock()
	b, err := json.Marshal(e.history)
	e.mu.RUnlock()
	if err != nil {
		return
	}
	_ = os.WriteFile(e.historyPath, b, 0o644)
}

func quoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func normalize(v any) any {
	switch t := v.(type) {
	case nil:
		return nil
	case []byte:
		return string(t)
	default:
		return t
	}
}
