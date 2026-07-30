package httpapi

import (
	"sync"
	"time"
)

type rateWindow struct {
	start time.Time
	count int
}

type fixedWindowLimiter struct {
	mu       sync.Mutex
	limit    int
	duration time.Duration
	entries  map[string]rateWindow
	now      func() time.Time
}

func newFixedWindowLimiter(
	limit int,
	duration time.Duration,
) *fixedWindowLimiter {
	return &fixedWindowLimiter{
		limit:    limit,
		duration: duration,
		entries:  make(map[string]rateWindow),
		now:      time.Now,
	}
}

func (l *fixedWindowLimiter) allow(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	window, exists := l.entries[key]
	if !exists || now.Sub(window.start) >= l.duration {
		l.entries[key] = rateWindow{start: now, count: 1}
		l.prune(now)
		return true, 0
	}
	if window.count >= l.limit {
		return false, l.duration - now.Sub(window.start)
	}
	window.count++
	l.entries[key] = window
	return true, 0
}

func (l *fixedWindowLimiter) reset(key string) {
	l.mu.Lock()
	delete(l.entries, key)
	l.mu.Unlock()
}

func (l *fixedWindowLimiter) prune(now time.Time) {
	if len(l.entries) < 1024 {
		return
	}
	for key, window := range l.entries {
		if now.Sub(window.start) >= l.duration {
			delete(l.entries, key)
		}
	}
}
