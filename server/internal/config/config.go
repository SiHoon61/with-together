package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	defaultAppEnv              = "development"
	defaultPort                = "8080"
	defaultStaticDir           = "../web/dist"
	defaultMigrationsPath      = "db/migrations"
	defaultDatabaseMaxConns    = int32(10)
	defaultDatabaseMinConns    = int32(1)
	defaultDatabaseMaxLifetime = 30 * time.Minute
	defaultDatabaseMaxIdleTime = 15 * time.Minute
	defaultLogMaxSizeMB        = 100
	defaultLogMaxBackups       = 3
	defaultLogMaxAgeDays       = 28
)

type Config struct {
	AppEnv string
	Port   string

	StaticDir      string
	RunMigrations  bool
	MigrationsPath string

	DatabaseURL             string
	DatabaseMaxConns        int32
	DatabaseMinConns        int32
	DatabaseMaxConnLifetime time.Duration
	DatabaseMaxConnIdleTime time.Duration

	// LogFile이 비어 있으면 표준 출력만 사용한다. 설정 시 lumberjack으로 회전 파일에도 기록한다.
	LogFile       string
	LogMaxSizeMB  int
	LogMaxBackups int
	LogMaxAgeDays int
	LogCompress   bool
}

func Load() (Config, error) {
	cfg := Config{
		AppEnv:                  getEnv("APP_ENV", defaultAppEnv),
		Port:                    getEnv("PORT", defaultPort),
		StaticDir:               getEnv("STATIC_DIR", defaultStaticDir),
		RunMigrations:           getEnvBool("RUN_MIGRATIONS", false),
		MigrationsPath:          getEnv("MIGRATIONS_PATH", defaultMigrationsPath),
		DatabaseURL:             strings.TrimSpace(os.Getenv("DATABASE_URL")),
		DatabaseMaxConns:        getEnvInt32("DATABASE_MAX_CONNS", defaultDatabaseMaxConns),
		DatabaseMinConns:        getEnvInt32("DATABASE_MIN_CONNS", defaultDatabaseMinConns),
		DatabaseMaxConnLifetime: getEnvDuration("DATABASE_MAX_CONN_LIFETIME", defaultDatabaseMaxLifetime),
		DatabaseMaxConnIdleTime: getEnvDuration("DATABASE_MAX_CONN_IDLE_TIME", defaultDatabaseMaxIdleTime),
		LogFile:                 strings.TrimSpace(os.Getenv("LOG_FILE")),
		LogMaxSizeMB:            getEnvInt("LOG_MAX_SIZE_MB", defaultLogMaxSizeMB),
		LogMaxBackups:           getEnvInt("LOG_MAX_BACKUPS", defaultLogMaxBackups),
		LogMaxAgeDays:           getEnvInt("LOG_MAX_AGE_DAYS", defaultLogMaxAgeDays),
		LogCompress:             getEnvBool("LOG_COMPRESS", true),
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func (c Config) Validate() error {
	switch {
	case strings.TrimSpace(c.DatabaseURL) == "":
		return errors.New("DATABASE_URL is required")
	case strings.TrimSpace(c.Port) == "":
		return errors.New("PORT is required")
	case c.RunMigrations && strings.TrimSpace(c.MigrationsPath) == "":
		return errors.New("MIGRATIONS_PATH is required when RUN_MIGRATIONS is enabled")
	case c.DatabaseMaxConns <= 0:
		return fmt.Errorf("DATABASE_MAX_CONNS must be positive: %d", c.DatabaseMaxConns)
	case c.DatabaseMinConns < 0:
		return fmt.Errorf("DATABASE_MIN_CONNS cannot be negative: %d", c.DatabaseMinConns)
	case c.DatabaseMinConns > c.DatabaseMaxConns:
		return fmt.Errorf("DATABASE_MIN_CONNS cannot exceed DATABASE_MAX_CONNS: %d > %d", c.DatabaseMinConns, c.DatabaseMaxConns)
	case c.DatabaseMaxConnLifetime <= 0:
		return fmt.Errorf("DATABASE_MAX_CONN_LIFETIME must be positive: %s", c.DatabaseMaxConnLifetime)
	case c.DatabaseMaxConnIdleTime <= 0:
		return fmt.Errorf("DATABASE_MAX_CONN_IDLE_TIME must be positive: %s", c.DatabaseMaxConnIdleTime)
	case c.LogFile != "" && c.LogMaxSizeMB <= 0:
		return fmt.Errorf("LOG_MAX_SIZE_MB must be positive when LOG_FILE is set: %d", c.LogMaxSizeMB)
	case c.LogFile != "" && c.LogMaxBackups < 0:
		return fmt.Errorf("LOG_MAX_BACKUPS cannot be negative: %d", c.LogMaxBackups)
	case c.LogFile != "" && c.LogMaxAgeDays < 0:
		return fmt.Errorf("LOG_MAX_AGE_DAYS cannot be negative: %d", c.LogMaxAgeDays)
	default:
		return nil
	}
}

func getEnv(key string, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}

func getEnvInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getEnvBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	switch strings.ToLower(value) {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}

func getEnvInt32(key string, fallback int32) int32 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.ParseInt(value, 10, 32)
	if err != nil {
		return fallback
	}

	return int32(parsed)
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}

	return parsed
}
