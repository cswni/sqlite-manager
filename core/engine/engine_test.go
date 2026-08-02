package engine_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/sqlite-manager/core/engine"
)

// ponytail: one runnable check that fails if core open/query/schema breaks
func TestCoreRoundTrip(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "t.db")
	e := engine.New()
	id, err := e.Create(dbPath)
	if err != nil {
		t.Fatal(err)
	}
	defer e.Close(id)

	_, err = e.Query(id, `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)`, nil, 1)
	if err != nil {
		t.Fatal(err)
	}
	_, err = e.Query(id, `INSERT INTO users(name) VALUES ('ada')`, nil, 1)
	if err != nil {
		t.Fatal(err)
	}
	res, err := e.Query(id, `SELECT id, name FROM users`, nil, 10)
	if err != nil {
		t.Fatal(err)
	}
	if res.RowCount != 1 || res.Rows[0][1] != "ada" {
		t.Fatalf("unexpected result: %+v", res)
	}
	sch, err := e.Schema(id)
	if err != nil {
		t.Fatal(err)
	}
	if len(sch.Tables) != 1 || sch.Tables[0].Name != "users" {
		t.Fatalf("schema: %+v", sch)
	}
	csvPath := filepath.Join(dir, "out.csv")
	if err := e.ExportCSV(id, "users", csvPath); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(csvPath); err != nil {
		t.Fatal(err)
	}
}
