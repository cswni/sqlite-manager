package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/sqlite-manager/core/engine"
	"github.com/sqlite-manager/core/rpc"
)

func main() {
	listen := flag.String("listen", "", "HTTP listen address (e.g. 127.0.0.1:17832); empty = stdin JSON-RPC")
	flag.Parse()

	eng := engine.New()
	srv := rpc.New(eng)

	if *listen != "" {
		fmt.Fprintf(os.Stderr, "sqliteman-core listening on http://%s\n", *listen)
		if err := srv.ServeHTTP(*listen); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		return
	}
	if err := srv.ServeStdio(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
