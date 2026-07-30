package contact

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/M-Aidil-Fitrah/portofolio/backend/internal/config"
)

var (
	ErrInvalid     = errors.New("invalid contact message")
	ErrUnavailable = errors.New("contact delivery unavailable")
	ErrDelivery    = errors.New("contact delivery failed")
)

type Message struct {
	Name     string
	Email    string
	Category string
	Body     string
	Company  string
}

type Service struct {
	cfg    config.ContactConfig
	client *http.Client
}

func NewService(cfg config.ContactConfig, client *http.Client) *Service {
	if client == nil {
		client = &http.Client{Timeout: 10 * time.Second}
	}
	return &Service{cfg: cfg, client: client}
}

func (s *Service) Send(ctx context.Context, input Message) error {
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.TrimSpace(input.Email)
	input.Category = strings.TrimSpace(input.Category)
	input.Body = strings.TrimSpace(input.Body)
	input.Company = strings.TrimSpace(input.Company)
	if input.Company != "" {
		return nil
	}
	if !validMessage(input) {
		return ErrInvalid
	}
	if s.cfg.APIKey == "" || s.cfg.From == "" || s.cfg.To == "" {
		return ErrUnavailable
	}
	payload := struct {
		From    string   `json:"from"`
		To      []string `json:"to"`
		ReplyTo string   `json:"reply_to"`
		Subject string   `json:"subject"`
		Text    string   `json:"text"`
	}{
		From:    s.cfg.From,
		To:      []string{s.cfg.To},
		ReplyTo: input.Email,
		Subject: "[Portfolio] New " + input.Category + " message",
		Text: strings.Join([]string{
			"Name: " + input.Name,
			"Email: " + input.Email,
			"Category: " + input.Category,
			"",
			input.Body,
		}, "\n"),
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("encode contact email: %w", err)
	}
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		s.cfg.APIURL,
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("create contact delivery request: %w", err)
	}
	request.Header.Set("Authorization", "Bearer "+s.cfg.APIKey)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("User-Agent", "portfolio-api/1.0")
	response, err := s.client.Do(request)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrDelivery, err)
	}
	defer response.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 64<<10))
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf(
			"%w: provider returned status %d",
			ErrDelivery,
			response.StatusCode,
		)
	}
	return nil
}

func validMessage(input Message) bool {
	if input.Name == "" || len([]rune(input.Name)) > 120 ||
		input.Body == "" || len([]rune(input.Body)) > 5000 ||
		len(input.Email) > 254 {
		return false
	}
	switch input.Category {
	case "general", "internship", "collaboration":
	default:
		return false
	}
	address, err := mail.ParseAddress(input.Email)
	return err == nil &&
		address.Address == input.Email &&
		!strings.ContainsAny(input.Email, "\r\n")
}
