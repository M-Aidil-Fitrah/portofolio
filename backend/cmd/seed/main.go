// Command seed fills a local or staging database with realistic demo content
// and can remove exactly what it created.
//
// Media is pushed through the same path the studio uses — presign, upload,
// complete, then the real worker — rather than inserting rows that claim to be
// ready. Injected rows would have no WebP derivatives, no video poster and no
// asset_variants, so they would describe a state production can never reach,
// and the seed would prove nothing about whether processing works.
package main

import (
	"bytes"
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/activity"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/processing"
	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/storage"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Everything the seed creates carries one of these two marks, and purge deletes
// by the marks alone. Hand-authored content can never match them, so a purge
// cannot reach real data even if it runs against the wrong database.
const (
	slugPrefix   = "demo-"
	assetMarkSQL = `{"seed": true}`
)

func main() {
	if err := run(); err != nil {
		slog.Error("seed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	keep := flag.Bool(
		"keep",
		false,
		"apply: add to existing demo content instead of replacing it",
	)
	flag.Parse()
	command := flag.Arg(0)
	if command == "" {
		command = "apply"
	}
	if command != "apply" && command != "purge" {
		return errors.New("usage: seed [-keep] <apply|purge>")
	}

	if err := config.LoadDotEnv(); err != nil {
		return fmt.Errorf("load .env: %w", err)
	}
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if cfg.Environment == config.EnvironmentProduction {
		return errors.New("refusing to seed a production environment")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	pool, err := database.Open(ctx, cfg.Database)
	if err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}
	defer pool.Close()

	store, err := storage.NewMinioStore(cfg.Storage)
	if err != nil {
		return fmt.Errorf("initialize object storage: %w", err)
	}
	if err := store.Ready(ctx); err != nil {
		return fmt.Errorf("object storage is not ready: %w", err)
	}

	if command == "purge" {
		return purge(ctx, pool, store, cfg)
	}
	if !*keep {
		// Re-running apply should converge on the same result rather than pile
		// up duplicates, so clear previous demo content first.
		if err := purge(ctx, pool, store, cfg); err != nil {
			return err
		}
	}
	return apply(ctx, pool, store, cfg)
}

func purge(
	ctx context.Context,
	pool *pgxpool.Pool,
	store *storage.MinioStore,
	cfg config.Config,
) error {
	activities := activity.NewService(pool)
	rows, err := pool.Query(
		ctx,
		`SELECT id::text FROM activities WHERE slug LIKE $1`,
		slugPrefix+"%",
	)
	if err != nil {
		return fmt.Errorf("list demo activities: %w", err)
	}
	var activityIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return fmt.Errorf("scan demo activity: %w", err)
		}
		activityIDs = append(activityIDs, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return fmt.Errorf("read demo activities: %w", err)
	}

	// Activities first: deleting them releases the asset links, and the cascade
	// clears their comments and likes too.
	for _, id := range activityIDs {
		if err := activities.Delete(ctx, id); err != nil &&
			!errors.Is(err, activity.ErrNotFound) {
			return fmt.Errorf("delete activity %s: %w", id, err)
		}
	}

	assets := storage.NewService(pool, store, cfg.Storage.PresignTimeout)
	assetRows, err := pool.Query(
		ctx,
		`SELECT id::text FROM media_assets WHERE metadata @> $1::jsonb`,
		assetMarkSQL,
	)
	if err != nil {
		return fmt.Errorf("list demo assets: %w", err)
	}
	var assetIDs []string
	for assetRows.Next() {
		var id string
		if err := assetRows.Scan(&id); err != nil {
			assetRows.Close()
			return fmt.Errorf("scan demo asset: %w", err)
		}
		assetIDs = append(assetIDs, id)
	}
	assetRows.Close()
	if err := assetRows.Err(); err != nil {
		return fmt.Errorf("read demo assets: %w", err)
	}

	for _, id := range assetIDs {
		if err := assets.Delete(ctx, id); err != nil &&
			!errors.Is(err, storage.ErrNotFound) {
			return fmt.Errorf("delete asset %s: %w", id, err)
		}
	}

	fmt.Printf(
		"purged %d demo activit(ies) and %d demo asset(s)\n",
		len(activityIDs),
		len(assetIDs),
	)
	return nil
}

type seedAsset struct {
	name     string
	url      string
	kind     string
	mimeType string
	alt      string
}

type seedActivity struct {
	slug     string
	titleEN  string
	titleID  string
	bodyEN   string
	bodyID   string
	category string
	tags     []string
	pinned   bool
	cover    seedAsset
	gallery  []seedAsset
}

func apply(
	ctx context.Context,
	pool *pgxpool.Pool,
	store *storage.MinioStore,
	cfg config.Config,
) error {
	assets := storage.NewService(pool, store, cfg.Storage.PresignTimeout)
	activities := activity.NewService(pool)

	plan := seedPlan()
	uploaded := map[string]string{}
	var created []string

	for _, item := range plan {
		for _, asset := range append([]seedAsset{item.cover}, item.gallery...) {
			if _, done := uploaded[asset.url]; done {
				continue
			}
			id, err := uploadSeedAsset(ctx, assets, asset)
			if err != nil {
				return fmt.Errorf("upload %s: %w", asset.name, err)
			}
			uploaded[asset.url] = id
			created = append(created, id)
			fmt.Printf("uploaded %s\n", asset.name)
		}
	}

	if err := markSeedAssets(ctx, pool, created); err != nil {
		return err
	}
	if err := processPending(ctx, pool, store, created); err != nil {
		return err
	}

	for _, item := range plan {
		inputs := []activity.AssetInput{{
			ID:       uploaded[item.cover.url],
			Role:     "cover",
			Position: 0,
			Alt:      item.cover.alt,
		}}
		for index, asset := range item.gallery {
			inputs = append(inputs, activity.AssetInput{
				ID:       uploaded[asset.url],
				Role:     "gallery",
				Position: int32(index),
				Alt:      asset.alt,
			})
		}
		slug := item.slug
		if _, err := activities.Create(ctx, activity.WriteInput{
			Slug:     &slug,
			Title:    activity.LocalizedText{EN: item.titleEN, ID: item.titleID},
			Caption:  activity.LocalizedText{EN: item.bodyEN, ID: item.bodyID},
			Body:     activity.LocalizedText{EN: item.bodyEN, ID: item.bodyID},
			Category: item.category,
			Date:     time.Now().UTC().Truncate(24 * time.Hour),
			Tags:     item.tags,
			Assets:   inputs,
			Status:   "published",
			Pinned:   item.pinned,
		}); err != nil {
			return fmt.Errorf("create activity %s: %w", item.slug, err)
		}
		fmt.Printf("created %s\n", item.slug)
	}

	fmt.Printf(
		"\nseeded %d activit(ies) and %d asset(s)\nremove with: make seed-purge\n",
		len(plan),
		len(created),
	)
	return nil
}

func uploadSeedAsset(
	ctx context.Context,
	assets *storage.Service,
	asset seedAsset,
) (string, error) {
	body, err := download(ctx, asset.url)
	if err != nil {
		return "", err
	}
	presigned, err := assets.Presign(ctx, storage.PresignInput{
		Kind:     asset.kind,
		Filename: asset.name,
		MimeType: asset.mimeType,
		ByteSize: int64(len(body)),
	})
	if err != nil {
		return "", fmt.Errorf("presign: %w", err)
	}
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPut,
		presigned.UploadURL,
		bytes.NewReader(body),
	)
	if err != nil {
		return "", fmt.Errorf("build upload request: %w", err)
	}
	request.Header.Set("Content-Type", asset.mimeType)
	request.ContentLength = int64(len(body))
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("upload to storage: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode >= 300 {
		return "", fmt.Errorf("upload to storage: status %d", response.StatusCode)
	}
	if _, err := assets.Complete(ctx, presigned.Asset.ID); err != nil {
		return "", fmt.Errorf("complete upload: %w", err)
	}
	return presigned.Asset.ID, nil
}

func download(ctx context.Context, url string) ([]byte, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	client := &http.Client{Timeout: 2 * time.Minute}
	response, err := client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("fetch %s: %w", url, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch %s: status %d", url, response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, 256<<20))
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", url, err)
	}
	return body, nil
}

func markSeedAssets(
	ctx context.Context,
	pool *pgxpool.Pool,
	ids []string,
) error {
	if len(ids) == 0 {
		return nil
	}
	// Marked after Complete, because completing the upload rewrites metadata.
	if _, err := pool.Exec(
		ctx,
		`UPDATE media_assets
		 SET metadata = metadata || $1::jsonb
		 WHERE id = ANY($2::uuid[])`,
		assetMarkSQL,
		ids,
	); err != nil {
		return fmt.Errorf("mark seed assets: %w", err)
	}
	return nil
}

// processPending drains the queue in-process so `make seed` works on its own.
// Requiring a separate worker would make the common case a two-terminal ritual
// and leave half-processed assets behind when it is forgotten.
func processPending(
	ctx context.Context,
	pool *pgxpool.Pool,
	store *storage.MinioStore,
	assetIDs []string,
) error {
	worker := processing.NewWorker(pool, store, processing.WorkerOptions{
		ID:                "seed-worker",
		Logger:            slog.Default(),
		ImageBinary:       os.Getenv("IMAGEMAGICK_BINARY"),
		FFmpegBinary:      os.Getenv("FFMPEG_BINARY"),
		FFprobeBinary:     os.Getenv("FFPROBE_BINARY"),
		LibreOfficeBinary: os.Getenv("LIBREOFFICE_BINARY"),
		PDFInfoBinary:     os.Getenv("PDFINFO_BINARY"),
		PDFToPPMBinary:    os.Getenv("PDFTOPPM_BINARY"),
		DocumentSandbox:   os.Getenv("DOCUMENT_SANDBOX_BINARY"),
	})
	fmt.Println("processing media...")
	for {
		processed, err := worker.ProcessOne(ctx)
		if err != nil {
			return fmt.Errorf("process media: %w", err)
		}
		if !processed {
			break
		}
	}

	var pending, failed int
	if err := pool.QueryRow(
		ctx,
		`SELECT
		   COUNT(*) FILTER (WHERE status <> 'ready' AND status <> 'failed'),
		   COUNT(*) FILTER (WHERE status = 'failed')
		 FROM media_assets WHERE id = ANY($1::uuid[])`,
		assetIDs,
	).Scan(&pending, &failed); err != nil {
		return fmt.Errorf("check media status: %w", err)
	}
	if failed > 0 || pending > 0 {
		return fmt.Errorf(
			"media did not finish processing: %d failed, %d pending",
			failed,
			pending,
		)
	}
	return nil
}

// Public placeholder media keeps the repository free of binary fixtures. These
// hosts serve deterministic images for a given seed value, so re-running
// produces the same pictures.
func seedPlan() []seedActivity {
	image := func(name, id, alt string) seedAsset {
		return seedAsset{
			name:     name,
			url:      "https://picsum.photos/id/" + id + "/1600/900.jpg",
			kind:     "image",
			mimeType: "image/jpeg",
			alt:      alt,
		}
	}
	return []seedActivity{
		{
			slug:     slugPrefix + "activity-studio",
			titleEN:  "Building the activity studio",
			titleID:  "Membangun activity studio",
			bodyEN:   "A writing surface that previews every public layout before anything ships.",
			bodyID:   "Ruang menulis yang mempratinjau setiap tata letak publik sebelum dirilis.",
			category: "project",
			tags:     []string{"Next.js", "Go", "PostgreSQL"},
			pinned:   true,
			cover:    image("studio-cover.jpg", "180", "Workstation with code on screen"),
			gallery: []seedAsset{
				image("studio-01.jpg", "0", "Laptop on a desk"),
				image("studio-02.jpg", "48", "Architecture detail"),
			},
		},
		{
			slug:     slugPrefix + "media-pipeline",
			titleEN:  "A media pipeline that refuses bad input",
			titleID:  "Pipeline media yang menolak input buruk",
			bodyEN:   "Magic bytes decide what a file is, never its extension.",
			bodyID:   "Magic byte yang menentukan jenis berkas, bukan ekstensinya.",
			category: "learning",
			tags:     []string{"ImageMagick", "FFmpeg"},
			cover:    image("pipeline-cover.jpg", "1043", "Long exposure of moving light"),
			gallery: []seedAsset{
				image("pipeline-01.jpg", "1015", "River between rocks"),
			},
		},
		{
			slug:     slugPrefix + "type-safe-contract",
			titleEN:  "One contract, both sides",
			titleID:  "Satu kontrak, dua sisi",
			bodyEN:   "OpenAPI generates the Go server and the React Query client from one file.",
			bodyID:   "OpenAPI menghasilkan server Go dan client React Query dari satu berkas.",
			category: "project",
			tags:     []string{"OpenAPI", "TypeScript"},
			cover:    image("contract-cover.jpg", "20", "Desk with a laptop and coffee"),
		},
	}
}
