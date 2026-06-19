# 🚀 GeekzCS WA Bot Hosting Server — Panduan Running & Cloudflare Tunnel

Repositoy ini adalah platform web hosting WhatsApp Bot dengan asisten AI Customer Service interaktif yang sudah terintegrasi secara dinamis dengan **Firebase Firestore** menggunakan File Kredensial Admin SDK (`serviceAccountKey.json`).

Karena pada server **Pterodactyl** Anda tidak memiliki **Subdomain Manager** bawaan atau keterbatasan pembukaan port publik, panduan ini memuat cara running menggunakan **Cloudflare Tunnel**. Dengan Cloudflare Tunnel, aplikasi Anda di Pterodactyl dapat diakses publik secara aman lewat domain pribadi (`https://bot.geekzstore.com`) tanpa harus membuka port di firewall atau mengubah konfigurasi router VPS!

---

## 📂 Struktur Penting Proyek
- `/serviceAccountKey.json`: File Kredensial Firebase Admin SDK Anda yang digunakan untuk sinkronisasi database dari local storage ke Google Cloud Firestore.
- `/server.ts`: Server backend Express + Socket.io yang mendeteksi port dari variabel lingkungan Pterodactyl (`SERVER_PORT` / `PORT`).
- `src/db/dbInstance.ts`: Mengelola data offline-friendly lokal dengan sinkronisasi otomatis dua arah (read & write) ke Firestore saat service account terdeteksi.

---

## 🛠️ Langkah 1: Persiapan Variabel Lingkungan (.env)

Buat file `.env` di root directory Pterodactyl Anda, lalu sesuaikan isinya:

```env
# Gemini AI API Key (Bisa didapatkan di Google AI Studio)
GEMINI_API_KEY="AIzaSy..."

# URL Publik Aplikasi Anda (Akan disesuaikan setelah setting Cloudflare Tunnel)
APP_URL="https://bot.domainanda.com"

# Kunci keamanan JWT untuk session subscribers
JWT_SECRET="ganti-dengan-string-rahasia-apa-saja"

# Brand Kustom Web Anda
VITE_BRAND_NAME="GeekzCS"
VITE_BRAND_DESCRIPTION="Platform hosting bot WhatsApp gratis dengan integrasi AI dan pembayaran instan."
```

---

## 🎯 Langkah 2: Konfigurasi Cloudflare Tunnel (`cloudflared`)

Cloudflare Tunnel (`cloudflared`) menghubungkan port aplikasi server Node.js internal Pterodactyl ke jaringan global Cloudflare menggunakan rute aman terenkripsi HTTPS secara gratis.

Ada 2 cara yang dapat Anda gunakan tergantung pada akses Anda di server:

### Metode A: Diatur oleh Admin VPS (Disarankan & Paling Stabil)
Jika Anda memiliki akses SSH sebagai user `root` di VPS induk tempat Pterodactyl terinstall:

1. **Buat Tunnel Baru:**
   - Masuk ke dashboard [Cloudflare Zero Trust](https://one.dash.cloudflare.com).
   - Di menu sebelah kiri, pilih **Networks** ➜ **Tunnels**.
   - Klik **Create a Tunnel**, pilih **Cloudflared** sebagai konektor, lalu klik **Next**.
   - Masukkan nama tunnel Anda (misal: `geekzcs-ptero`), lalu rancang **Save tunnel**.

2. **Install Service Cloudflared di VPS:**
   - Pilih sistem operasi server VPS Anda (misal: **Debian** atau **Ubuntu**).
   - Jalankan perintah install & run `cloudflared` yang disediakan Cloudflare di terminal SSH VPS Anda. Perintahnya akan terlihat seperti ini:
     ```bash
     curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && dpkg -i cloudflared.deb
     cloudflared service install <TOKEN_TUNNEL_ANDA>
     ```

3. **Routing Hostname di Cloudflare:**
   - Setelah status tunnel di Cloudflare Zero Trust berubah jadi **Active**, beralihlah ke tab **Public Hostname**.
   - Klik **Add a public hostname**.
   - Isi form tersebut:
     - **Subdomain**: `bot` (Atau sesuaikan keinginan Anda)
     - **Domain**: `geekzstore-b6741.id` (Gunakan domain milik Anda yang sudah tersambung di Cloudflare)
     - **Service Type**: `HTTP`
     - **URL**: `localhost:<ALOKASI_PORT_PTERODACTYL>` (Misal: `localhost:12044` atau port yang diberikan oleh Pterodactyl kepada server Anda).
   - Simpan pengaturan. Kini domain tersebut otomatis mengarah ke Pterodactyl Node Anda!

---

### Metode B: Diatur Langsung di Dalam Pterodactyl (Untuk User Panel Tanpa Akses SSH VPS)
Jika Anda hanya memiliki akses masuk ke Panel Pterodactyl (tanpa SSH atau tanpa akses root hosting):

1. **Buat Tunnel** di dashboard [Cloudflare Zero Trust](https://one.dash.cloudflare.com) seperti panduan di atas.
2. **Salin "Tunnel Token" saja** yang diberikan oleh Cloudflare (Token panjang di bawah bagian Command: `cloudflared.exe service install <TOKEN>`).
3. Pada halaman panel Pterodactyl Anda, klik **File Manager**.
4. Unduh binary `cloudflared` versi Linux x86/64 langsung ke workspace Pterodactyl Anda. Caranya bisa ditambahkan di startup command ptero atau buat script bash sederhana `download-cloudflare.sh`:
   ```bash
   wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
   chmod +x cloudflared
   ```
5. Pada panel Pterodactyl **Startup Settings** atau di `package.json` Anda, pastikan perintah runner menjalankan cloudflare tunnel secara paralel di background:
   ```bash
   ./cloudflared tunnel --no-autoupdate run --token <TOKEN_PTERO_ANDA> & npm run start
   ```

*(Kini server akan mulai mengirim traffic secara aman langsung dari kontainer Docker Pterodactyl ke Cloudflare edge network).*

---

## 🚀 Langkah 3: Menjalankan Aplikasi di Pterodactyl

Pastikan konfigurasi Startup / Runner Egg aplikasi Node.js Anda di Pterodactyl diarahkan ke file server utama.

### Menggunakan Entrypoint Produksi:
Pterodactyl membutuhkan instalasi dependencies dan proses build untuk performa optimal.

1. **Pastikan dependencies terinstall:**
   Di terminal Pterodactyl, jalankan perintah di bawah atau biarkan Egg memicu `npm install` secara otomatis:
   ```bash
   npm install
   ```

2. **Lakukan Build Aplikasi:**
   Kompresi client dan kompilasi server ke bundle biner Node super cepat:
   ```bash
   npm run build
   ```

3. **Mulai Server:**
   ```bash
   npm run start
   ```

Aplikasi web Anda akan otomatis mengikat dan running di port alokasi Pterodactyl (`process.env.SERVER_PORT` / `process.env.PORT` / `3000`).

---

## 🔥 Sinkronisasi Otomatis Google Firebase Firestore

Jika program mendeteksi adanya file `serviceAccountKey.json` di root folder:
- **Auto-Sync-on-Startup:** Aplikasi akan langsung mengambil (fetching) semua data pengguna, bot, pengaturan, logs, dan rincian transaksi online-friendly yang pernah disimpan di Cloud Firestore ke dalam lokal memori agar bot tetap berjalan lancar.
- **Auto-Save-to-Cloud:** Setiap perubahan (misal user mendaftarkan bot baru, log aktivitas bot di-update, pembayaran diproses) akan langsung diunggah tersinkronisasi ke database awan Firebase secara riil time (Live-Updating).
- Jika file service account dihapus, aplikasi akan secara aman kembali menggunakan database lokal berbasis file `.json` (`sessions/database_state.json`) tanpa error.

---

## 🛠️ Troubleshooting (Tanya & Jawab)

**T: Kenapa muncul error "Port 3000 already in use" di Pterodactyl?**
- **J:** Pterodactyl mengalokasikan port dinamis untuk server Anda (misal `12040`). Kode server kami sudah di-update agar otomatis mendeteksi port alokasi tersebut melalui parameter `process.env.PORT || process.env.SERVER_PORT`. Pastikan Anda memberikan port alokasi resmi dari tab "Ports"/"Allocations" di Pterodactyl.

**T: Apakah Cloudflare Tunnel memerlukan SSL Certificate secara manual?**
- **J:** Tidak! Cloudflare Tunnel mengurus generate sertifikat enkripsi SSL HTTPS gratis secara otomatis untuk domain / subdomain Anda. Anda langsung mendapatkan ikon gembok aman 🔒 hijau di browser tanpa ribet.

---

*Selamat! Aplikasi WhatsApp Bot Hosting Anda milik GeekzCS kini berjalan terintegrasi di Pterodactyl dan dapat diakses dari manapun secara aman melintasi Cloudflare Tunnel.*
