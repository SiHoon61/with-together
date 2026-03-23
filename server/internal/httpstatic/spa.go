package httpstatic

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

func New(apiHandler http.Handler, staticDir string) http.Handler {
	spaHandler := newSPAHandler(staticDir)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/healthz":
			apiHandler.ServeHTTP(w, r)
		case strings.HasPrefix(r.URL.Path, "/v1/"):
			apiHandler.ServeHTTP(w, r)
		default:
			spaHandler.ServeHTTP(w, r)
		}
	})
}

type spaHandler struct {
	staticDir string
}

func newSPAHandler(staticDir string) http.Handler {
	return &spaHandler{staticDir: staticDir}
}

func (h *spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.TrimSpace(h.staticDir) == "" {
		http.NotFound(w, r)
		return
	}

	indexPath := filepath.Join(h.staticDir, "index.html")
	requestPath := path.Clean("/" + r.URL.Path)
	relativePath := strings.TrimPrefix(requestPath, "/")

	if relativePath != "" {
		candidatePath := filepath.Join(h.staticDir, filepath.FromSlash(relativePath))
		if info, err := os.Stat(candidatePath); err == nil {
			if info.IsDir() {
				if _, err := os.Stat(filepath.Join(candidatePath, "index.html")); err == nil {
					http.ServeFile(w, r, filepath.Join(candidatePath, "index.html"))
					return
				}
			} else {
				http.ServeFile(w, r, candidatePath)
				return
			}
		}

		if path.Ext(relativePath) != "" {
			http.NotFound(w, r)
			return
		}
	}

	http.ServeFile(w, r, indexPath)
}
