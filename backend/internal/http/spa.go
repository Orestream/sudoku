//nolint:revive // Package name conflicts with standard library but is intentional
package http

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// NewSPAServer creates a handler for serving a single-page application.
func NewSPAServer(dir string) http.Handler {
	abs, err := filepath.Abs(dir)
	if err != nil {
		abs = dir
	}
	fileServer := http.FileServer(http.Dir(abs))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.NotFound(w, r)
			return
		}

		urlPath := r.URL.Path
		if urlPath == "" || urlPath == "/" {
			http.ServeFile(w, r, filepath.Join(abs, "index.html"))
			return
		}

		if strings.HasPrefix(urlPath, "/api/") {
			http.NotFound(w, r)
			return
		}

		rel := strings.TrimPrefix(path.Clean("/"+urlPath), "/")
		clean := filepath.FromSlash(rel)
		full := filepath.Join(abs, clean)
		if fileExists(full) && !isDir(full) {
			r2 := newRequestWithPath(r, "/"+rel)
			fileServer.ServeHTTP(w, r2)
			return
		}

		http.ServeFile(w, r, filepath.Join(abs, "index.html"))
	})
}

func newRequestWithPath(r *http.Request, path string) *http.Request {
	r2 := r.Clone(r.Context())
	r2.URL.Path = path
	return r2
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func isDir(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}
