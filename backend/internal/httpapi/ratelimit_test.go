package httpapi

import (
	"testing"
	"time"
)

func TestFixedWindowLimiter(t *testing.T) {
	now := time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC)
	limiter := newFixedWindowLimiter(2, time.Minute)
	limiter.now = func() time.Time { return now }

	if allowed, _ := limiter.allow("client"); !allowed {
		t.Fatal("first request was rejected")
	}
	if allowed, _ := limiter.allow("client"); !allowed {
		t.Fatal("second request was rejected")
	}
	if allowed, retryAfter := limiter.allow("client"); allowed ||
		retryAfter != time.Minute {
		t.Fatalf(
			"third request = %v, %v, want false, 1m",
			allowed,
			retryAfter,
		)
	}

	now = now.Add(time.Minute)
	if allowed, _ := limiter.allow("client"); !allowed {
		t.Fatal("request after window reset was rejected")
	}

	limiter.reset("client")
	if allowed, _ := limiter.allow("client"); !allowed {
		t.Fatal("request after explicit reset was rejected")
	}
}
