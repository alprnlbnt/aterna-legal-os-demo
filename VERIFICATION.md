# Aterna Sentetik Tarayıcı Demosu — Doğrulama

**Doğrulama zamanı:** 2026-09-04 07:00 UTC

**Kapsam:** `/aterna-demo/` React/Vite/TypeScript uygulaması

**Sınır:** Bu bir ürün tasarımı ve iş akışı demosudur; production uygulaması, gerçek güvenlik mimarisi veya entegrasyon kanıtı değildir.

## Otomatik kalite kapıları

- `npm run format:check` — PASS
- `npm run typecheck` — PASS
- `npm run lint` — PASS
- `npm test` — PASS, 43/43
- `npm run build` — PASS, 88 modül

## Tarayıcı testleri

### Telefon — Pixel 7

- Golden path ve güvenlik/ürün sınırları: 8/8 PASS
- Axe erişilebilirlik ve klavye akışı: 7/7 PASS

### Masaüstü — Desktop Chrome

- Golden path ve güvenlik/ürün sınırları: 8/8 PASS
- Axe erişilebilirlik ve klavye akışı: 7/7 PASS

- Önceki temel demo için Claude Code / Opus final review: PASS
- Back-office genişletmesi için Claude Opus final review: max-turns nedeniyle tamamlanamadı; gerçek kalite kapısı test sonuçları aşağıdadır.
- Back-office E2E: phone 7/7 PASS, desktop 7/7 PASS
- Back-office + eski ekranlar a11y: phone 18/18 PASS, desktop 18/18 PASS
- Eski golden path: phone 8/8 PASS, desktop 8/8 PASS
- Yeni route runtime smoke: 6/6 route, 0 page error

Tarayıcı testlerinde doğrulanan ana davranışlar:

- Evrak → eşleşme → görev/süre onayı → kesin takvim golden path’i
- Çevrimdışı durumda final onayın kilitlenmesi
- Yetkisiz personada hassas dosyanın maskelenmesi
- Duplicate belgenin otomatik silinmemesi
- Kritik belge farkında yeniden iç onay
- İç onay ile dış gönderimin ayrı kalması
- Sesli nottaki “sil/onayla/gönder” ifadelerinin işlem tetiklememesi
- Demo resetinin fixture başlangıcına dönmesi
- Dış hosta network isteği yapılmaması

## Gerçek görsel tarayıcı kontrolü

Playwright Chromium ile Pixel 7 ve 1440×1000 masaüstü ekran görüntüleri alındı. İlk incelemede mobil içerik fold altında kaldığı için tasarım düzeltildi.

Düzeltme sonrası ölçümler:

- Mobil Bugün ekranında ilk acil kart `y=391–558px`; 839px viewport içinde tamamen görünür.
- Mobil Gelen Evrak ekranında belge/OCR önizlemesi yaklaşık `y=440px` konumunda başlar.
- Mobil topbar, filtre, sekme ve metadata disclosure hedefleri en az 44px’tir.
- Masaüstü sol navigasyon + orta çalışma alanı + sağ bağlam paneli korunur.

## Ağsızlık ve sentetik veri

- Runtime kaynaklarında `fetch`, XHR, WebSocket veya harici URL bulunmadı.
- `index.html` CSP’si `connect-src 'none'` uygular.
- OCR, AI, UYAP/UETS, mesaj, e-posta, ses-metin ve dış gönderim davranışları yerel fixture/store ile taklit edilir.
- Tüm kişi, dosya, mahkeme, belge ve finans verileri kurgudur.

## Bilinen sınırlar

- Persona/yetki maskelemesi istemci tarafı demo davranışıdır; gerçek kimlik doğrulama değildir.
- `localStorage` kalıcılığı demo kolaylığı içindir; production veri saklama yaklaşımı değildir.
- “Gönderildi”, “OCR tamamlandı” ve benzeri durumlar gerçek servislere bağlanmaz.
- Gerçek çok kiracılı izolasyon, KMS, veritabanı, yedekleme ve deployment bu demonun kapsamı dışındadır.
