package activity

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/database/dbgen"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/text/unicode/norm"
)

var (
	ErrInvalid  = errors.New("invalid activity")
	ErrNotFound = errors.New("activity not found")
	ErrConflict = errors.New("activity conflict")
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// Matches the activities.slug column width.
const maxSlugLength = 72

type LocalizedText struct {
	ID string
	EN string
}

type Activity struct {
	ID             string
	Slug           *string
	Title          LocalizedText
	Caption        LocalizedText
	Body           LocalizedText
	Category       string
	Date           time.Time
	Tags           []string
	Assets         []Asset
	Status         string
	Pinned         bool
	Progress       *string
	RelatedProject *string
	Version        int64
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type Asset struct {
	ID         string
	Role       string
	Position   int32
	Kind       string
	Status     string
	Filename   string
	MimeType   string
	ByteSize   int64
	Width      *int32
	Height     *int32
	DurationMS *int64
	PageCount  *int32
	Alt        string
	Caption    LocalizedText
	Label      LocalizedText
	Crop       map[string]any
	Metadata   map[string]any
}

type AssetInput struct {
	ID       string
	Role     string
	Position int32
	Alt      string
	Caption  LocalizedText
	Label    LocalizedText
	Crop     map[string]any
	Metadata map[string]any
}

type WriteInput struct {
	Slug           *string
	Title          LocalizedText
	Caption        LocalizedText
	Body           LocalizedText
	Category       string
	Date           time.Time
	Tags           []string
	Assets         []AssetInput
	Status         string
	Pinned         bool
	Progress       *string
	RelatedProject *string
	Version        int64
}

type ListOptions struct {
	Limit    int32
	Offset   int32
	Search   string
	Category *string
}

type ListResult struct {
	Items  []Activity
	Limit  int32
	Offset int32
	Total  int64
}

type Service struct {
	pool    *pgxpool.Pool
	queries *dbgen.Queries
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool, queries: dbgen.New(pool)}
}

func (s *Service) ListPublic(
	ctx context.Context,
	options ListOptions,
) (ListResult, error) {
	options = normalizeListOptions(options)
	category, err := optionalCategory(options.Category)
	if err != nil {
		return ListResult{}, err
	}
	search := strings.TrimSpace(options.Search)
	if len(search) > 120 {
		return ListResult{}, ErrInvalid
	}

	rows, err := s.queries.ListPublicActivities(
		ctx,
		dbgen.ListPublicActivitiesParams{
			Search:     search,
			Category:   category,
			PageOffset: options.Offset,
			PageLimit:  options.Limit,
		},
	)
	if err != nil {
		return ListResult{}, fmt.Errorf("list public activities: %w", err)
	}
	total, err := s.queries.CountPublicActivities(
		ctx,
		dbgen.CountPublicActivitiesParams{
			Search:   search,
			Category: category,
		},
	)
	if err != nil {
		return ListResult{}, fmt.Errorf("count public activities: %w", err)
	}
	items, err := s.hydrate(ctx, s.queries, rows)
	if err != nil {
		return ListResult{}, err
	}
	return ListResult{
		Items:  items,
		Limit:  options.Limit,
		Offset: options.Offset,
		Total:  total,
	}, nil
}

func (s *Service) GetPublic(
	ctx context.Context,
	slug string,
) (Activity, error) {
	if !slugPattern.MatchString(slug) {
		return Activity{}, ErrNotFound
	}
	row, err := s.queries.GetPublishedActivityBySlug(ctx, &slug)
	if errors.Is(err, pgx.ErrNoRows) {
		// Fall back to a retired slug. The response still carries the current
		// slug, so the caller can send the reader to the canonical URL.
		return s.getPublicByRetiredSlug(ctx, slug)
	}
	if err != nil {
		return Activity{}, fmt.Errorf("get published activity: %w", err)
	}
	return s.hydrateOne(ctx, s.queries, row)
}

func (s *Service) getPublicByRetiredSlug(
	ctx context.Context,
	slug string,
) (Activity, error) {
	activityID, err := s.queries.GetActivityIDByRedirectSlug(ctx, slug)
	if errors.Is(err, pgx.ErrNoRows) {
		return Activity{}, ErrNotFound
	}
	if err != nil {
		return Activity{}, fmt.Errorf("resolve slug redirect: %w", err)
	}
	row, err := s.queries.GetPublishedActivityByID(ctx, activityID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Activity{}, ErrNotFound
	}
	if err != nil {
		return Activity{}, fmt.Errorf("get redirected activity: %w", err)
	}
	return s.hydrateOne(ctx, s.queries, row)
}

func (s *Service) ListAdmin(
	ctx context.Context,
	options ListOptions,
) (ListResult, error) {
	options = normalizeListOptions(options)
	rows, err := s.queries.ListAdminActivities(
		ctx,
		dbgen.ListAdminActivitiesParams{
			PageLimit:  options.Limit,
			PageOffset: options.Offset,
		},
	)
	if err != nil {
		return ListResult{}, fmt.Errorf("list admin activities: %w", err)
	}
	total, err := s.queries.CountAdminActivities(ctx)
	if err != nil {
		return ListResult{}, fmt.Errorf("count admin activities: %w", err)
	}
	items, err := s.hydrate(ctx, s.queries, rows)
	if err != nil {
		return ListResult{}, err
	}
	return ListResult{
		Items:  items,
		Limit:  options.Limit,
		Offset: options.Offset,
		Total:  total,
	}, nil
}

func (s *Service) GetAdmin(
	ctx context.Context,
	id string,
) (Activity, error) {
	activityID, err := parseUUID(id)
	if err != nil {
		return Activity{}, ErrNotFound
	}
	row, err := s.queries.GetActivityByID(ctx, activityID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Activity{}, ErrNotFound
	}
	if err != nil {
		return Activity{}, fmt.Errorf("get activity: %w", err)
	}
	return s.hydrateOne(ctx, s.queries, row)
}

func (s *Service) Create(
	ctx context.Context,
	input WriteInput,
) (Activity, error) {
	explicitSlug := input.Slug != nil
	input.Slug = createSlug(input.Slug, input.Title.ID)
	if err := validateWrite(input, false); err != nil {
		return Activity{}, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Activity{}, fmt.Errorf("begin create activity: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	queries := dbgen.New(tx)

	// A repeated title is normal in a journal feed, so a derived slug gets
	// disambiguated rather than rejected — failing at save time, after the
	// post is already written, is the worst moment to block. An explicitly
	// chosen slug is left alone: silently altering it would surprise.
	if input.Slug != nil && !explicitSlug {
		unique, err := uniqueSlug(ctx, queries, *input.Slug, input.Date)
		if err != nil {
			return Activity{}, err
		}
		input.Slug = &unique
	}

	params, err := createParams(input)
	if err != nil {
		return Activity{}, err
	}

	row, err := queries.CreateActivity(ctx, params)
	if err != nil {
		return Activity{}, mapDatabaseError(err)
	}
	if err := replaceTags(ctx, queries, row.ID, input.Tags); err != nil {
		return Activity{}, err
	}
	if err := replaceAssets(
		ctx, queries, row.ID, input.Status, input.Assets,
	); err != nil {
		return Activity{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Activity{}, fmt.Errorf("commit create activity: %w", err)
	}
	return s.hydrateOne(ctx, s.queries, row)
}

func (s *Service) Update(
	ctx context.Context,
	id string,
	input WriteInput,
) (Activity, error) {
	activityID, err := parseUUID(id)
	if err != nil {
		return Activity{}, ErrNotFound
	}
	if input.Version < 1 {
		return Activity{}, ErrInvalid
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return Activity{}, fmt.Errorf("begin update activity: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	queries := dbgen.New(tx)

	current, err := queries.GetActivityByID(ctx, activityID)
	if errors.Is(err, pgx.ErrNoRows) {
		return Activity{}, ErrNotFound
	}
	if err != nil {
		return Activity{}, fmt.Errorf("get activity for update: %w", err)
	}
	if input.Slug == nil {
		input.Slug = current.Slug
	} else if strings.TrimSpace(*input.Slug) == "" {
		input.Slug = nil
	}
	if err := validateWrite(input, true); err != nil {
		return Activity{}, err
	}
	params, err := updateParams(activityID, input)
	if err != nil {
		return Activity{}, err
	}
	// The new slug may itself be an old slug of this activity, so drop any
	// redirect that would otherwise shadow it before recording the rename.
	if input.Slug != nil {
		if err := queries.DeleteActivitySlugRedirect(
			ctx, *input.Slug,
		); err != nil {
			return Activity{}, fmt.Errorf("clear slug redirect: %w", err)
		}
	}

	row, err := queries.UpdateActivity(ctx, params)
	if errors.Is(err, pgx.ErrNoRows) {
		return Activity{}, ErrConflict
	}
	if err != nil {
		return Activity{}, mapDatabaseError(err)
	}

	if err := recordSlugRename(
		ctx, queries, activityID, current.Slug, input.Slug,
	); err != nil {
		return Activity{}, err
	}
	if err := replaceTags(ctx, queries, row.ID, input.Tags); err != nil {
		return Activity{}, err
	}
	if err := replaceAssets(
		ctx, queries, row.ID, input.Status, input.Assets,
	); err != nil {
		return Activity{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Activity{}, fmt.Errorf("commit update activity: %w", err)
	}
	return s.hydrateOne(ctx, s.queries, row)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	activityID, err := parseUUID(id)
	if err != nil {
		return ErrNotFound
	}
	affected, err := s.queries.DeleteActivity(ctx, activityID)
	if err != nil {
		return mapDatabaseError(err)
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) hydrate(
	ctx context.Context,
	queries *dbgen.Queries,
	rows []dbgen.Activity,
) ([]Activity, error) {
	items := make([]Activity, 0, len(rows))
	for _, row := range rows {
		item, err := s.hydrateOne(ctx, queries, row)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *Service) hydrateOne(
	ctx context.Context,
	queries *dbgen.Queries,
	row dbgen.Activity,
) (Activity, error) {
	tagRows, err := queries.ListActivityTags(ctx, row.ID)
	if err != nil {
		return Activity{}, fmt.Errorf("list activity tags: %w", err)
	}
	tags := make([]string, 0, len(tagRows))
	for _, tag := range tagRows {
		tags = append(tags, tag.Value)
	}
	assetRows, err := queries.ListActivityAssets(ctx, row.ID)
	if err != nil {
		return Activity{}, fmt.Errorf("list activity assets: %w", err)
	}
	assets := make([]Asset, 0, len(assetRows))
	for _, assetRow := range assetRows {
		assets = append(assets, assetFromRow(assetRow))
	}
	result := fromRow(row, tags)
	result.Assets = assets
	return result, nil
}

func replaceTags(
	ctx context.Context,
	queries *dbgen.Queries,
	activityID pgtype.UUID,
	tags []string,
) error {
	if err := queries.DeleteActivityTags(ctx, activityID); err != nil {
		return fmt.Errorf("delete activity tags: %w", err)
	}
	for position, value := range normalizeTags(tags) {
		if err := queries.InsertActivityTag(
			ctx,
			dbgen.InsertActivityTagParams{
				ActivityID: activityID,
				Position:   int32(position),
				Value:      value,
			},
		); err != nil {
			return fmt.Errorf("insert activity tag: %w", err)
		}
	}
	return nil
}

func replaceAssets(
	ctx context.Context,
	queries *dbgen.Queries,
	activityID pgtype.UUID,
	status string,
	assets []AssetInput,
) error {
	seenAssets := make(map[string]struct{}, len(assets))
	seenPositions := make(map[string]struct{}, len(assets))
	for _, input := range assets {
		if len(input.Alt) > 500 || input.Position < 0 {
			return ErrInvalid
		}
		assetID, err := parseUUID(input.ID)
		if err != nil {
			return ErrInvalid
		}
		if _, exists := seenAssets[input.ID]; exists {
			return ErrInvalid
		}
		positionKey := fmt.Sprintf("%s:%d", input.Role, input.Position)
		if _, exists := seenPositions[positionKey]; exists {
			return ErrInvalid
		}
		seenAssets[input.ID] = struct{}{}
		seenPositions[positionKey] = struct{}{}

		media, err := queries.GetMediaAssetForActivityLink(ctx, assetID)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrInvalid
		}
		if err != nil {
			return fmt.Errorf("get activity asset: %w", err)
		}
		if !validAssetRole(input.Role, string(media.Kind)) {
			return ErrInvalid
		}
		if input.Role == "cover" && input.Position != 0 {
			return ErrInvalid
		}
		if status == "published" &&
			media.Status != dbgen.AssetStatusReady {
			return ErrConflict
		}
	}

	if err := queries.DeleteActivityAssets(ctx, activityID); err != nil {
		return fmt.Errorf("delete activity assets: %w", err)
	}
	for _, input := range assets {
		assetID, _ := parseUUID(input.ID)
		crop, err := marshalOptionalObject(input.Crop)
		if err != nil {
			return ErrInvalid
		}
		metadata, err := marshalObject(input.Metadata)
		if err != nil {
			return ErrInvalid
		}
		if err := queries.InsertActivityAsset(
			ctx,
			dbgen.InsertActivityAssetParams{
				ActivityID: activityID,
				AssetID:    assetID,
				Role:       dbgen.ActivityAssetRole(input.Role),
				Position:   input.Position,
				AltText:    strings.TrimSpace(input.Alt),
				CaptionID:  strings.TrimSpace(input.Caption.ID),
				CaptionEn:  strings.TrimSpace(input.Caption.EN),
				LabelID:    strings.TrimSpace(input.Label.ID),
				LabelEn:    strings.TrimSpace(input.Label.EN),
				Crop:       crop,
				Metadata:   metadata,
			},
		); err != nil {
			return mapDatabaseError(err)
		}
	}
	return nil
}

func validAssetRole(role, kind string) bool {
	switch role {
	case "cover":
		return kind == "image"
	case "gallery":
		return kind == "image" || kind == "video"
	case "attachment":
		return kind == "document"
	default:
		return false
	}
}

func marshalObject(value map[string]any) ([]byte, error) {
	if value == nil {
		return []byte(`{}`), nil
	}
	body, err := json.Marshal(value)
	if err != nil || len(body) > 32<<10 {
		return nil, ErrInvalid
	}
	return body, nil
}

func marshalOptionalObject(value map[string]any) ([]byte, error) {
	if value == nil {
		return nil, nil
	}
	return marshalObject(value)
}

func assetFromRow(row dbgen.ListActivityAssetsRow) Asset {
	return Asset{
		ID:         uuid.UUID(row.AssetID.Bytes).String(),
		Role:       string(row.Role),
		Position:   row.Position,
		Kind:       string(row.Kind),
		Status:     string(row.Status),
		Filename:   row.OriginalFilename,
		MimeType:   row.MimeType,
		ByteSize:   row.ByteSize,
		Width:      row.Width,
		Height:     row.Height,
		DurationMS: row.DurationMs,
		PageCount:  row.PageCount,
		Alt:        row.AltText,
		Caption:    LocalizedText{ID: row.CaptionID, EN: row.CaptionEn},
		Label:      LocalizedText{ID: row.LabelID, EN: row.LabelEn},
		Crop:       decodeObject(row.Crop),
		Metadata:   decodeObject(row.LinkMetadata),
	}
}

func decodeObject(value []byte) map[string]any {
	if len(value) == 0 {
		return nil
	}
	var result map[string]any
	if json.Unmarshal(value, &result) != nil {
		return nil
	}
	return result
}

func validateWrite(input WriteInput, updating bool) error {
	if !validCategory(input.Category) ||
		!validStatus(input.Status) ||
		input.Date.IsZero() ||
		len(input.Tags) > 100 {
		return ErrInvalid
	}
	if input.Progress != nil && !validProgress(*input.Progress) {
		return ErrInvalid
	}
	if input.Slug != nil &&
		(len(*input.Slug) > maxSlugLength ||
			!slugPattern.MatchString(*input.Slug)) {
		return ErrInvalid
	}
	if input.Status == "published" &&
		(input.Slug == nil ||
			strings.TrimSpace(input.Title.ID) == "" ||
			strings.TrimSpace(input.Title.EN) == "") {
		return ErrInvalid
	}
	if updating && input.Version < 1 {
		return ErrInvalid
	}
	for _, tag := range normalizeTags(input.Tags) {
		if len(tag) > 64 {
			return ErrInvalid
		}
	}
	return nil
}

// recordSlugRename keeps the previous slug resolvable so links already shared
// or indexed under it do not die when the slug is edited.
func recordSlugRename(
	ctx context.Context,
	queries *dbgen.Queries,
	activityID pgtype.UUID,
	previous *string,
	next *string,
) error {
	if previous == nil || *previous == "" {
		return nil
	}
	if next != nil && *next == *previous {
		return nil
	}
	if err := queries.InsertActivitySlugRedirect(
		ctx,
		dbgen.InsertActivitySlugRedirectParams{
			Slug:       *previous,
			ActivityID: activityID,
		},
	); err != nil {
		return fmt.Errorf("record slug redirect: %w", err)
	}
	return nil
}

// uniqueSlug returns base when it is free, otherwise appends the activity date
// and, only if that is taken too, a counter. The date carries meaning a bare
// "-2" does not, and two posts sharing a title on one day is already unlikely.
// Redirect slugs are checked as well, so a new post cannot claim a URL that
// still points somewhere else.
func uniqueSlug(
	ctx context.Context,
	queries *dbgen.Queries,
	base string,
	date time.Time,
) (string, error) {
	pattern := base + "%"
	rows, err := queries.ListSlugsWithPrefix(ctx, &pattern)
	if err != nil {
		return "", fmt.Errorf("list slugs: %w", err)
	}
	taken := make(map[string]struct{}, len(rows))
	for _, row := range rows {
		if row != nil {
			taken[*row] = struct{}{}
		}
	}
	if _, exists := taken[base]; !exists {
		return base, nil
	}

	dated := base + "-" + date.UTC().Format("2006-01-02")
	if len(dated) > maxSlugLength {
		dated = base
	}
	if _, exists := taken[dated]; !exists {
		return dated, nil
	}
	for counter := 2; counter < 1000; counter++ {
		candidate := fmt.Sprintf("%s-%d", dated, counter)
		if len(candidate) > maxSlugLength {
			return "", ErrConflict
		}
		if _, exists := taken[candidate]; !exists {
			return candidate, nil
		}
	}
	return "", ErrConflict
}

func createSlug(explicit *string, titleID string) *string {
	if explicit != nil {
		value := strings.TrimSpace(*explicit)
		if value == "" {
			return nil
		}
		return &value
	}
	value := Slugify(titleID)
	if value == "" {
		return nil
	}
	return &value
}

func Slugify(value string) string {
	var builder strings.Builder
	previousHyphen := false
	for _, character := range norm.NFD.String(strings.ToLower(value)) {
		switch {
		case unicode.Is(unicode.Mn, character):
			continue
		case character >= 'a' && character <= 'z',
			character >= '0' && character <= '9':
			if builder.Len() >= 72 {
				break
			}
			builder.WriteRune(character)
			previousHyphen = false
		default:
			if builder.Len() > 0 && !previousHyphen && builder.Len() < 72 {
				builder.WriteByte('-')
				previousHyphen = true
			}
		}
	}
	return strings.Trim(builder.String(), "-")
}

func normalizeTags(tags []string) []string {
	result := make([]string, 0, len(tags))
	seen := make(map[string]struct{}, len(tags))
	for _, tag := range tags {
		tag = strings.TrimSpace(tag)
		key := strings.ToLower(tag)
		if tag == "" {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, tag)
	}
	return result
}

func normalizeListOptions(options ListOptions) ListOptions {
	if options.Limit == 0 {
		options.Limit = 20
	}
	if options.Limit < 1 {
		options.Limit = 1
	}
	if options.Limit > 50 {
		options.Limit = 50
	}
	if options.Offset < 0 {
		options.Offset = 0
	}
	return options
}

func optionalCategory(value *string) (*dbgen.ActivityCategory, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	if !validCategory(*value) {
		return nil, ErrInvalid
	}
	category := dbgen.ActivityCategory(*value)
	return &category, nil
}

func createParams(input WriteInput) (dbgen.CreateActivityParams, error) {
	date := pgtype.Date{Time: input.Date, Valid: true}
	return dbgen.CreateActivityParams{
		Slug:           input.Slug,
		TitleID:        input.Title.ID,
		TitleEn:        input.Title.EN,
		CaptionID:      input.Caption.ID,
		CaptionEn:      input.Caption.EN,
		BodyID:         input.Body.ID,
		BodyEn:         input.Body.EN,
		Category:       dbgen.ActivityCategory(input.Category),
		ActivityDate:   date,
		Status:         dbgen.ActivityStatus(input.Status),
		Pinned:         input.Pinned,
		Progress:       dbProgress(input.Progress),
		RelatedProject: trimOptional(input.RelatedProject),
	}, nil
}

func updateParams(
	id pgtype.UUID,
	input WriteInput,
) (dbgen.UpdateActivityParams, error) {
	create, err := createParams(input)
	if err != nil {
		return dbgen.UpdateActivityParams{}, err
	}
	return dbgen.UpdateActivityParams{
		Slug:            create.Slug,
		TitleID:         create.TitleID,
		TitleEn:         create.TitleEn,
		CaptionID:       create.CaptionID,
		CaptionEn:       create.CaptionEn,
		BodyID:          create.BodyID,
		BodyEn:          create.BodyEn,
		Category:        create.Category,
		ActivityDate:    create.ActivityDate,
		Status:          create.Status,
		Pinned:          create.Pinned,
		Progress:        create.Progress,
		RelatedProject:  create.RelatedProject,
		ActivityID:      id,
		ExpectedVersion: input.Version,
	}, nil
}

func dbProgress(value *string) *dbgen.ActivityProgress {
	if value == nil {
		return nil
	}
	progress := dbgen.ActivityProgress(*value)
	return &progress
}

func trimOptional(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func fromRow(row dbgen.Activity, tags []string) Activity {
	var progress *string
	if row.Progress != nil {
		value := string(*row.Progress)
		progress = &value
	}
	return Activity{
		ID:   row.ID.String(),
		Slug: row.Slug,
		Title: LocalizedText{
			ID: row.TitleID,
			EN: row.TitleEn,
		},
		Caption: LocalizedText{
			ID: row.CaptionID,
			EN: row.CaptionEn,
		},
		Body: LocalizedText{
			ID: row.BodyID,
			EN: row.BodyEn,
		},
		Category:       string(row.Category),
		Date:           row.ActivityDate.Time,
		Tags:           tags,
		Status:         string(row.Status),
		Pinned:         row.Pinned,
		Progress:       progress,
		RelatedProject: row.RelatedProject,
		Version:        row.Version,
		CreatedAt:      row.CreatedAt.Time,
		UpdatedAt:      row.UpdatedAt.Time,
	}
}

func parseUUID(value string) (pgtype.UUID, error) {
	var parsed pgtype.UUID
	if err := parsed.Scan(value); err != nil {
		return pgtype.UUID{}, err
	}
	return parsed, nil
}

func mapDatabaseError(err error) error {
	var databaseError *pgconn.PgError
	if errors.As(err, &databaseError) {
		switch databaseError.Code {
		case "23505":
			return ErrConflict
		case "23503":
			return ErrConflict
		case "23514", "22P02":
			return ErrInvalid
		}
	}
	return fmt.Errorf("activity database operation: %w", err)
}

func validCategory(value string) bool {
	switch value {
	case "project", "learning", "daily", "achievement":
		return true
	default:
		return false
	}
}

func validStatus(value string) bool {
	switch value {
	case "published", "draft", "hidden":
		return true
	default:
		return false
	}
}

func validProgress(value string) bool {
	switch value {
	case "learning", "shipped", "exploring":
		return true
	default:
		return false
	}
}
