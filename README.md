# VisionPath Telegram Mentor

VisionPath istifadəçinin seçdiyi istiqamətləri gündəlik mentor qeydləri və progress sistemi ilə izləyir.

## Telegram axını

1. İstifadəçi `/start` yazdıqda bot salamlayır və müraciət üçün adını soruşur.
2. Naviqasiya panelində yalnız **🚀 Başla** və **📊 Vision Board** düymələri görünür.
3. İstifadəçi kateqoriya və subkateqoriya seçir, sonra Vision Board üçün standart qeyddən istifadə edir və ya onu öz qeydi ilə dəyişir.
4. Bot istifadəçinin qeydini Vision Board-da saxlayır, əvvəl gündəlik push saatını soruşur, sonra seçilmiş subkateqoriyaya uyğun ilk mentor qeydini göndərir.
5. **❤️ Bəyəndim** düyməsi progressi 5% artırır və `Progress X% oldu` mesajını göstərir. 100%-də `🟢 Completed` göstərilir.
6. `/vision` və ya **📊 Vision Board** düyməsi bütün seçilmiş kateqoriya/subkateqoriyaları və progresslərini dashboard kimi göstərir.

Gündəlik push istifadəçinin yazdığı qeydi və ya əvvəl bəyəndiyi qeydi deyil, seçilmiş subkateqoriya üçün növbəti **mentor qeydini** göndərir. İstifadəçinin öz qeydi Vision Board-da görünür; **❤️ Bəyəndim** yalnız həmin subkateqoriyanın progressini artırır. Yenilənmiş progressi görmək üçün **📊 Vision Board** düyməsinə toxun.

Naviqasiya klaviaturasında yalnız **🚀 Başla** və **📊 Vision Board** var. Yeni hədəf əlavə etmək üçün Vision Board daxilindəki kontekst düyməsindən istifadə olunur.

Inline seçimlər qısamüddətli sessiya tokeni ilə qorunur: əvvəlki mesajdakı düyməyə klik etməklə onboarding-i yenidən davam etdirmək və ya eyni seçimi iki dəfə etmək mümkün deyil.

## Quraşdırma
Node.js 20+ tövsiyə olunur.

```bash
npm install
cp .env.example .env
npm start
```

`.env` daxilində öz MongoDB connection string və Telegram bot token-i yazılmalıdır.

## Komandalar
- `/start` — ilk istifadəçiyə salamlama/onboarding göstərir; mövcud istifadəçiyə yalnız naviqasiya panelini göstərir
- `/vision` — Vision Board-u açır

## Kontentin hazırlanması

Kateqoriya, subkateqoriya və mentor qeydləri `src/data/data.xlsx` faylından yüklənir. Botu ilk dəfə işlətməzdən əvvəl:

```bash
npm run seed
```

## Təhlükəsizlik
`.env` faylı paketə daxil edilmir. Real token və MongoDB credentials-ı yalnız lokal `.env` faylında saxla.
