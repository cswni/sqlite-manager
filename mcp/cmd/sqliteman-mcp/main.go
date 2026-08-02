package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"

	"github.com/sqlite-manager/core/engine"
	"github.com/sqlite-manager/core/rpc"
)

// Minimal MCP stdio server wrapping the same engine as the IDE.
// Tools: sqlite_open, sqlite_schema, sqlite_query, sqlite_exec, sqlite_export

type mcpReq struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      any             `json:"id"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
}

type mcpRes struct {
	JSONRPC string `json:"jsonrpc"`
	ID      any    `json:"id,omitempty"`
	Result  any    `json:"result,omitempty"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func main() {
	eng := engine.New()
	srv := rpc.New(eng)
	connID := ""

	sc := bufio.NewScanner(os.Stdin)
	sc.Buffer(make([]byte, 0, 64*1024), 16*1024*1024)
	enc := json.NewEncoder(os.Stdout)

	for sc.Scan() {
		line := sc.Bytes()
		if len(line) == 0 {
			continue
		}
		var req mcpReq
		if err := json.Unmarshal(line, &req); err != nil {
			continue
		}
		res := mcpRes{JSONRPC: "2.0", ID: req.ID}

		switch req.Method {
		case "initialize":
			res.Result = map[string]any{
				"protocolVersion": "2024-11-05",
				"capabilities":    map[string]any{"tools": map[string]any{}},
				"serverInfo":      map[string]any{"name": "sqliteman-mcp", "version": "0.1.0"},
			}
		case "notifications/initialized", "initialized":
			continue
		case "tools/list":
			res.Result = map[string]any{
				"tools": []map[string]any{
					tool("sqlite_open", "Open a SQLite database file", map[string]any{
						"type": "object",
						"properties": map[string]any{
							"path": map[string]any{"type": "string"},
						},
						"required": []string{"path"},
					}),
					tool("sqlite_schema", "Get schema for the open database", map[string]any{
						"type":       "object",
						"properties": map[string]any{},
					}),
					tool("sqlite_query", "Run a SQL query (SELECT)", map[string]any{
						"type": "object",
						"properties": map[string]any{
							"sql": map[string]any{"type": "string"},
						},
						"required": []string{"sql"},
					}),
					tool("sqlite_exec", "Execute SQL (DDL/DML)", map[string]any{
						"type": "object",
						"properties": map[string]any{
							"sql": map[string]any{"type": "string"},
						},
						"required": []string{"sql"},
					}),
					tool("sqlite_export", "Export a table to CSV or JSON", map[string]any{
						"type": "object",
						"properties": map[string]any{
							"table":  map[string]any{"type": "string"},
							"path":   map[string]any{"type": "string"},
							"format": map[string]any{"type": "string", "enum": []string{"csv", "json"}},
						},
						"required": []string{"table", "path", "format"},
					}),
				},
			}
		case "tools/call":
			var p struct {
				Name      string         `json:"name"`
				Arguments map[string]any `json:"arguments"`
			}
			_ = json.Unmarshal(req.Params, &p)
			if p.Arguments == nil {
				p.Arguments = map[string]any{}
			}
			out, err := callTool(srv, &connID, p.Name, p.Arguments)
			if err != nil {
				res.Error = &struct {
					Code    int    `json:"code"`
					Message string `json:"message"`
				}{Code: -32000, Message: err.Error()}
			} else {
				b, _ := json.MarshalIndent(out, "", "  ")
				res.Result = map[string]any{
					"content": []map[string]any{{"type": "text", "text": string(b)}},
				}
			}
		default:
			res.Error = &struct {
				Code    int    `json:"code"`
				Message string `json:"message"`
			}{Code: -32601, Message: fmt.Sprintf("method not found: %s", req.Method)}
		}
		_ = enc.Encode(res)
	}
}

func tool(name, desc string, schema map[string]any) map[string]any {
	return map[string]any{
		"name":        name,
		"description": desc,
		"inputSchema": schema,
	}
}

func callTool(srv *rpc.Server, connID *string, name string, args map[string]any) (any, error) {
	switch name {
	case "sqlite_open":
		r := srv.Handle(rpc.Request{ID: 1, Method: "open", Params: args})
		if r.Error != "" {
			return nil, fmt.Errorf("%s", r.Error)
		}
		m := r.Result.(map[string]any)
		*connID = m["connId"].(string)
		return r.Result, nil
	case "sqlite_schema":
		if *connID == "" {
			return nil, fmt.Errorf("open a database first")
		}
		r := srv.Handle(rpc.Request{ID: 1, Method: "schema", Params: map[string]any{"connId": *connID}})
		if r.Error != "" {
			return nil, fmt.Errorf("%s", r.Error)
		}
		return r.Result, nil
	case "sqlite_query", "sqlite_exec":
		if *connID == "" {
			return nil, fmt.Errorf("open a database first")
		}
		args["connId"] = *connID
		r := srv.Handle(rpc.Request{ID: 1, Method: "query", Params: args})
		if r.Error != "" {
			return nil, fmt.Errorf("%s", r.Error)
		}
		return r.Result, nil
	case "sqlite_export":
		if *connID == "" {
			return nil, fmt.Errorf("open a database first")
		}
		args["connId"] = *connID
		r := srv.Handle(rpc.Request{ID: 1, Method: "export", Params: args})
		if r.Error != "" {
			return nil, fmt.Errorf("%s", r.Error)
		}
		return r.Result, nil
	default:
		return nil, fmt.Errorf("unknown tool %s", name)
	}
}
