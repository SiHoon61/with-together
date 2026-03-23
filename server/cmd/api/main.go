package main

import (
	"context"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	api "github.com/imsihun/quest-room/server/internal/api"
	"github.com/imsihun/quest-room/server/internal/config"
	"github.com/imsihun/quest-room/server/internal/httpapi"
	"github.com/imsihun/quest-room/server/internal/httpstatic"
	"github.com/imsihun/quest-room/server/internal/migrations"
	"github.com/imsihun/quest-room/server/internal/postgres"
	"github.com/imsihun/quest-room/server/internal/service"
	"github.com/imsihun/quest-room/server/internal/store"
	"github.com/joho/godotenv"
	"gopkg.in/natefinch/lumberjack.v2"
)

func main() {
	// .env는 Go 런타임이 자동으로 읽지 않음 — 로컬 개발용으로 선택 로드
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	logger := log.New(logWriter(cfg), "", log.LstdFlags|log.LUTC|log.Lshortfile)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	startupCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if cfg.RunMigrations {
		logger.Printf("running migrations path=%s", cfg.MigrationsPath)
		if err := migrations.Up(cfg.DatabaseURL, cfg.MigrationsPath); err != nil {
			logger.Fatalf("run migrations: %v", err)
		}
	}

	pool, err := postgres.Connect(startupCtx, cfg)
	if err != nil {
		logger.Fatalf("connect postgres: %v", err)
	}

	dataStore := store.New(pool)
	defer dataStore.Close()

	svc := service.New(dataStore)
	handler := httpapi.New(svc)
	rootHandler := httpstatic.New(api.Handler(handler), cfg.StaticDir)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           rootHandler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Printf("server listening env=%s addr=%s", cfg.AppEnv, server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("listen and serve: %v", err)
		}
	}()

	<-ctx.Done()
	logger.Println("shutdown signal received")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Printf("graceful shutdown failed: %v", err)
	}
}

func logWriter(cfg config.Config) io.Writer {
	if cfg.LogFile == "" {
		return os.Stdout
	}

	lj := &lumberjack.Logger{
		Filename:   cfg.LogFile,
		MaxSize:    cfg.LogMaxSizeMB,
		MaxBackups: cfg.LogMaxBackups,
		MaxAge:     cfg.LogMaxAgeDays,
		Compress:   cfg.LogCompress,
	}
	return io.MultiWriter(os.Stdout, lj)
}
