package secure

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
)

func GeneratePrefixedID(prefix string) (string, error) {
	suffix, err := randomHex(16)
	if err != nil {
		return "", err
	}

	return prefix + "_" + suffix, nil
}

func GenerateOpaqueToken(prefix string) (string, error) {
	buf := make([]byte, 24)
	if _, err := io.ReadFull(rand.Reader, buf); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}

	return prefix + "_" + base64.RawURLEncoding.EncodeToString(buf), nil
}

func HashToken(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func randomHex(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := io.ReadFull(rand.Reader, buf); err != nil {
		return "", fmt.Errorf("read random bytes: %w", err)
	}

	return hex.EncodeToString(buf), nil
}
