package rpc

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"

	"github.com/sqlite-manager/core/engine"
)

type Request struct {
	ID     any            `json:"id"`
	Method string         `json:"method"`
	Params map[string]any `json:"params"`
}

type Response struct {
	ID     any    `json:"id"`
	Result any    `json:"result,omitempty"`
	Error  string `json:"error,omitempty"`
}

type Server struct {
	eng *engine.Engine
	mu  sync.Mutex
}

func New(eng *engine.Engine) *Server {
	return &Server{eng: eng}
}

func (s *Server) Handle(req Request) Response {
	res := Response{ID: req.ID}
	p := req.Params
	if p == nil {
		p = map[string]any{}
	}
	var err error
	var result any

	switch req.Method {
	case "open":
		result, err = s.eng.Open(str(p, "path"))
		if err == nil {
			result = map[string]any{"connId": result, "path": str(p, "path")}
		}
	case "create":
		result, err = s.eng.Create(str(p, "path"))
		if err == nil {
			result = map[string]any{"connId": result, "path": str(p, "path")}
		}
	case "close":
		err = s.eng.Close(str(p, "connId"))
		result = map[string]any{"ok": err == nil}
	case "list_connections":
		result = s.eng.ListConnections()
	case "schema":
		result, err = s.eng.Schema(str(p, "connId"))
	case "query":
		limit := int(num(p, "limit", 1000))
		result, err = s.eng.Query(str(p, "connId"), str(p, "sql"), nil, limit)
	case "exec":
		result, err = s.eng.Query(str(p, "connId"), str(p, "sql"), nil, 1)
	case "table_rows":
		result, err = s.eng.TableRows(str(p, "connId"), str(p, "table"), int(num(p, "offset", 0)), int(num(p, "limit", 100)), str(p, "where"))
	case "update_cell":
		err = s.eng.UpdateCell(str(p, "connId"), str(p, "table"), str(p, "pkCol"), p["pkVal"], str(p, "col"), p["val"])
		result = map[string]any{"ok": err == nil}
	case "schema_apply":
		err = s.eng.SchemaApply(str(p, "connId"), str(p, "ddl"))
		result = map[string]any{"ok": err == nil}
	case "migrate_plan":
		result, err = s.eng.MigratePlan(str(p, "dir"))
	case "migrate_apply":
		result, err = s.eng.MigrateApply(str(p, "connId"), str(p, "dir"))
	case "export":
		format := str(p, "format")
		path := str(p, "path")
		table := str(p, "table")
		conn := str(p, "connId")
		switch format {
		case "csv":
			err = s.eng.ExportCSV(conn, table, path)
		case "json":
			err = s.eng.ExportJSON(conn, table, path)
		default:
			err = fmt.Errorf("unsupported format %s", format)
		}
		result = map[string]any{"ok": err == nil, "path": path}
	case "import":
		n, e := s.eng.ImportCSV(str(p, "connId"), str(p, "table"), str(p, "path"))
		err = e
		result = map[string]any{"rows": n}
	case "history_list":
		result = s.eng.HistoryList(int(num(p, "limit", 50)))
	case "ping":
		result = map[string]any{"ok": true, "name": "sqliteman-core"}
	default:
		err = fmt.Errorf("unknown method %s", req.Method)
	}

	if err != nil {
		res.Error = err.Error()
	} else {
		res.Result = result
	}
	return res
}

func (s *Server) ServeStdio() error {
	in := bufio.NewScanner(os.Stdin)
	in.Buffer(make([]byte, 0, 64*1024), 16*1024*1024)
	enc := json.NewEncoder(os.Stdout)
	for in.Scan() {
		line := in.Bytes()
		if len(line) == 0 {
			continue
		}
		var req Request
		if err := json.Unmarshal(line, &req); err != nil {
			_ = enc.Encode(Response{Error: err.Error()})
			continue
		}
		res := s.Handle(req)
		if err := enc.Encode(res); err != nil {
			return err
		}
	}
	return in.Err()
}

func (s *Server) ServeHTTP(addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/rpc", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			cors(w)
			w.WriteHeader(204)
			return
		}
		cors(w)
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		var req Request
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		res := s.Handle(req)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(res)
	})
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		cors(w)
		_, _ = w.Write([]byte(`{"ok":true}`))
	})
	return http.ListenAndServe(addr, mux)
}

func cors(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
}

func str(p map[string]any, k string) string {
	v, ok := p[k]
	if !ok || v == nil {
		return ""
	}
	switch t := v.(type) {
	case string:
		return t
	default:
		return fmt.Sprint(t)
	}
}

func num(p map[string]any, k string, def float64) float64 {
	v, ok := p[k]
	if !ok || v == nil {
		return def
	}
	switch t := v.(type) {
	case float64:
		return t
	case int:
		return float64(t)
	case json.Number:
		f, _ := t.Float64()
		return f
	default:
		return def
	}
}
