package activity

import "testing"

func TestSlugifyUsesStableIndonesianCharacters(t *testing.T) {
	if got := Slugify("Aktivitas Éksplorasi & Proyek Baru!"); got !=
		"aktivitas-eksplorasi-proyek-baru" {
		t.Fatalf("Slugify() = %q", got)
	}
}

func TestSlugifyLimitsLength(t *testing.T) {
	got := Slugify(
		"Ini adalah judul aktivitas yang sangat panjang dan terus berlanjut " +
			"hingga melampaui batas slug yang disepakati",
	)
	if len(got) > 72 || got[len(got)-1] == '-' {
		t.Fatalf("Slugify() = %q (%d bytes)", got, len(got))
	}
}

func TestNormalizeTags(t *testing.T) {
	got := normalizeTags([]string{" Go ", "go", "", "PostgreSQL"})
	if len(got) != 2 || got[0] != "Go" || got[1] != "PostgreSQL" {
		t.Fatalf("normalizeTags() = %#v", got)
	}
}
