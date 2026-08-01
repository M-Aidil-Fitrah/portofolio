package processing

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	defaultOriginalRetention  = 72 * time.Hour
	defaultRetentionSweep     = time.Hour
	defaultRetentionBatchSize = 100
	// A sweep retries what it could not purge, so cap the repeated reporting.
	maxReportedRetentionFailures = 10
)

// Retention deletes expired raw uploads; document originals are exempt in SQL.
type Retention struct {
	queries   *dbgen.Queries
	store     storage.ObjectStore
	logger    *slog.Logger
	retention time.Duration
	interval  time.Duration
	batchSize int32
	now       func() time.Time
}

type RetentionOptions struct {
	Logger        *slog.Logger
	Retention     time.Duration
	SweepInterval time.Duration
	BatchSize     int32
}

func NewRetention(
	pool *pgxpool.Pool,
	store storage.ObjectStore,
	options RetentionOptions,
) *Retention {
	if options.Logger == nil {
		options.Logger = slog.Default()
	}
	if options.Retention <= 0 {
		options.Retention = defaultOriginalRetention
	}
	if options.SweepInterval <= 0 {
		options.SweepInterval = defaultRetentionSweep
	}
	if options.BatchSize <= 0 {
		options.BatchSize = defaultRetentionBatchSize
	}
	return &Retention{
		queries:   dbgen.New(pool),
		store:     store,
		logger:    options.Logger,
		retention: options.Retention,
		interval:  options.SweepInterval,
		batchSize: options.BatchSize,
		now:       time.Now,
	}
}

// Run sweeps immediately, then on every tick.
func (r *Retention) Run(ctx context.Context) error {
	r.logger.Info(
		"original retention started",
		"retention", r.retention.String(),
		"interval", r.interval.String(),
	)
	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()
	for {
		purged, err := r.SweepOnce(ctx)
		if purged > 0 {
			r.logger.Info("purged media originals", "count", purged)
		}
		if err != nil && ctx.Err() == nil {
			r.logger.Error("purge media originals", "error", err)
		}
		select {
		case <-ctx.Done():
			r.logger.Info("original retention stopped")
			return nil
		case <-ticker.C:
		}
	}
}

// SweepOnce drains the backlog in batches; a batch with no success ends it.
func (r *Retention) SweepOnce(ctx context.Context) (int, error) {
	cutoff := pgtype.Timestamptz{
		Time: r.now().UTC().Add(-r.retention), Valid: true,
	}
	total := 0
	var failures []error
	for {
		expired, err := r.queries.ListPurgeableAssetOriginals(
			ctx,
			dbgen.ListPurgeableAssetOriginalsParams{
				PurgeBefore: cutoff, RowLimit: r.batchSize,
			},
		)
		if err != nil {
			failures = append(
				failures,
				fmt.Errorf("list purgeable originals: %w", err),
			)
			break
		}
		if len(expired) == 0 {
			break
		}
		purged, batchFailures := r.purgeBatch(ctx, expired)
		total += purged
		if len(failures) < maxReportedRetentionFailures {
			failures = append(failures, batchFailures...)
		}
		if purged == 0 ||
			len(expired) < int(r.batchSize) ||
			ctx.Err() != nil {
			break
		}
	}
	return total, errors.Join(failures...)
}

func (r *Retention) purgeBatch(
	ctx context.Context,
	expired []dbgen.ListPurgeableAssetOriginalsRow,
) (int, []error) {
	purged := 0
	var failures []error
	for _, asset := range expired {
		if ctx.Err() != nil {
			break
		}
		assetID := uuid.UUID(asset.ID.Bytes).String()
		if strings.TrimSpace(asset.OriginalObjectKey) == "" {
			failures = append(
				failures,
				fmt.Errorf("asset %s has a blank original object key", assetID),
			)
			continue
		}
		// Storage first: the reverse order strands an unreferenced object.
		if err := r.store.Remove(ctx, asset.OriginalObjectKey); err != nil {
			failures = append(
				failures,
				fmt.Errorf("remove original of asset %s: %w", assetID, err),
			)
			continue
		}
		if _, err := r.queries.MarkAssetOriginalPurged(
			ctx,
			asset.ID,
		); err != nil {
			failures = append(
				failures,
				fmt.Errorf("mark asset %s purged: %w", assetID, err),
			)
			continue
		}
		purged++
	}
	return purged, failures
}
