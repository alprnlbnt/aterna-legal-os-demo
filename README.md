# Aterna Legal OS — Sentetik Tarayıcı Demosu

Bu klasör, Aterna Legal OS ürün davranışlarını göstermek için hazırlanmış React + Vite + TypeScript demosudur. Production uygulaması, güvenlik mimarisi veya entegrasyon örneği değildir. Tüm kişi, dosya, belge, mahkeme, finans ve audit verileri kurgudur.

## Çalıştırma

Node.js 20+ önerilir.

```bash
cd aterna-demo
npm install
npm run dev
```

Tarayıcıda `http://127.0.0.1:4173` adresini açın. Uygulama `HashRouter` kullandığından rotalar `/#/bugun` biçimindedir.

Production derlemesi ve yerel önizleme:

```bash
npm run build
npm run preview
```

`vite.config.ts` içindeki `base: './'` nedeniyle çıktı göreli varlık yolları kullanır. Modern tarayıcıların `file://` üzerinde ES modüllerine uyguladığı güvenlik kısıtları değişebildiği için `dist/` klasörünü `npm run preview` veya herhangi bir yerel statik dosya sunucusuyla açmak en güvenilir yoldur.

## Test ve kalite komutları

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run test:a11y
```

Playwright tarayıcısı sistemde yoksa bir kez `npx playwright install chromium` çalıştırın. E2E paketi telefon ve masaüstü projelerinde golden path, çevrimdışı kilit, yetki maskelemesi, duplicate kararı, kritik belge farkı, pasif ses komutları, reset ve dış network isteği yasağını kontrol eder.

## Doğrulama

Ayrıntılı test, tarayıcı ve ağsızlık sonuçları için [VERIFICATION.md](VERIFICATION.md) dosyasına bakın.

## Demo turu

1. `/demo` içinden **Rehberli turu başlat** seçin.
2. Bugün ekranındaki `Bilirkişi_Raporu.pdf` kartını açın.
3. Orijinal ve OCR türevini karşılaştırın; iki eşleşme adayından birini açıkça seçin.
4. Görev/süre adayını onay kuyruğuna gönderin.
5. Kaynak pasajı ve üç farklı tarihi değerlendirin; gerekçe ve ikinci doğrulamadan sonra teyit edin.
6. Kesin görevin Bugün ve Takvim’e yansıdığını görün.
7. `belge-teklif-2` içinde kritik sürüm farkını, iç onayı ve ayrı dış gönderim kapısını deneyin.
8. Duruşma ekranında sesli nottaki “sil/gönder” ifadelerinin işlem tetiklemediğini görün.

Diğer giriş noktaları:

- OCR hatası: `/gelen/evrak-003`
- Eşleşmemiş evrak: `/gelen/evrak-004`
- Duplicate kararı: `/gelen/evrak-005`
- UETS “5 gün” doğrulaması: `/gorevler/aday-sure-002`
- Potansiyel dosya ve manuel süre: `/dosyalar/dosya-pot-501`
- Basit cari/tahsilat: `/finans`

## Ağsızlık ve veri sınırı

- Runtime kodunda `fetch`, XHR, WebSocket, analytics, dış font veya CDN yoktur.
- `index.html` CSP’si `connect-src 'none'` uygular; görsel/font yalnız `self` ve izin verilen yerel/data kaynaklarıdır.
- OCR, AI, UYAP/UETS, mesaj, e-posta, ses-metin ve dış gönderim sonuçları TypeScript fixture’ları ve `setTimeout` ile taklit edilir.
- “Gönderildi” yalnız yerel Zustand store durumudur; gerçek alıcı veya servis yoktur.
- localStorage anahtarı `aterna-demo-state`tir. **Demoyu sıfırla** bu çalışma durumunu seed verisine döndürür.

## Kabul kriteri eşleşmesi

- Route ve navigasyon: telefon alt sekmeleri, masaüstü sol rail + içerik + sağ bağlam paneli, Cmd/Ctrl-K.
- State kataloğu: `/demo` üzerinden default/loading/empty/error; persona ile unauthorized; offline anahtarı; işlemlerle success.
- Belge/OCR: orijinal ve OCR ayrı, belirsiz alan ve OCR başarısız fallback’i.
- Matching: gerekçe/güven/kaynak pasajı; birden çok adayda varsayılan seçim yok; eşleşmemiş/potansiyel/duplicate yolları.
- Süre/görev: aday, doğrulama rozeti, çoklu tarih, gerekçe kapısı, ikinci doğrulama, kesin görev + takvim + audit.
- Potansiyel dosya: mahkeme/esas olmadan kayıt, manuel süre türleri, vekaletname bitiş ayrımı, kalıcı eksik belge, aktif dosyaya geçmişi koruyan dönüşüm.
- Belge: üç tür, katkı kaynağı, eksik ücret kilidi, sürüm/fark/kritik değişiklik, iç onay ve ayrı dış gönderim.
- Duruşma/ses: kaynaklı hazırlık raporu, çevrimdışı sabitleme, kayıt kontrolleri, ses ≠ metin, saniye aralıklı adaylar, pasif komut ifadeleri.
- Kişiler ve finans: kişi/dosya ilişkisi, basit conflict uyarısı, kalem bazlı ve manuel cari/tahsilat.
- Ayarlar/demo: onay matrisi, kilitli işlemler, yoğunluk, persona, offline, saat, durum laboratuvarı, tur ve reset.

## Bilinçli demo varsayımları

Bildirim eşikleri, acil sıralaması, ilk kanal vurgusu, takvim fixture tarihleri ve onay matrisi başlangıç değerleri ürün kararları kesinleşmediği için arayüzde “Demo varsayımı” olarak işaretlidir. İstemci tarafı persona maskelemesi gerçek kimlik doğrulama veya tenant izolasyonu değildir.

Gizli dosya notları için bu demoda ayrıca şu yetki varsayımı uygulanır: kullanıcı dosyaya erişebilmeli ve dosyanın sorumlu avukatı veya yönetici avukat olmalıdır. Çalışan avukatın yalnız dosya erişimi olması yeterli değildir; sekreter ve stajyerler gizli notları göremez.
