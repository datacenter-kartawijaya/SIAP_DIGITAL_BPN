# Panduan Integrasi & Migrasi MongoDB

Dokumen ini menjelaskan arsitektur baru sistem database Anda yang telah dimigrasi dari Firebase Firestore ke **MongoDB**, serta panduan lengkap cara melakukan konfigurasi baik di server online (saat ini) maupun migrasi ke **Local Area Network (LAN)** setelah selesai tahap pengembangan (*development*).

---

## 1. Arsitektur Sistem Baru (Hybrid Mode)

Untuk memudahkan masa transisi, sistem database dirancang dalam bentuk **Hybrid/Fail-over Mode**:
1. **MongoDB Mode**: Jika variabel `MONGODB_URI` dikonfigurasi di file environment (`.env`), aplikasi akan otomatis terhubung ke database MongoDB (baik MongoDB Atlas di cloud, ataupun server MongoDB lokal di jaringan LAN).
2. **Local JSON Disk Mode (Fail-over)**: Jika variabel `MONGODB_URI` tidak diisi atau kosong, sistem akan otomatis menyimpan data ke dalam disk lokal server dalam bentuk file JSON di dalam folder `/data/*.json`. Hal ini membuat aplikasi tetap bisa dijalankan secara instan tanpa perlu mengonfigurasi database eksternal terlebih dahulu selama masa pengembangan.

> **Catatan Autentikasi**: Autentikasi Pengguna (Login/Register) tetap diamankan menggunakan layanan **Firebase Authentication** agar keamanan kredensial dan token sesi pengguna tetap terjaga secara standar industri.

---

## 2. Cara Konfigurasi Variabel Environment (`.env`)

Untuk mengaktifkan MongoDB, Anda hanya perlu menambahkan baris berikut pada file konfigurasi environment (`.env`) di server Cloud Run atau komputer lokal Anda:

```env
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>/<nama-database>?retryWrites=true&w=majority"
```

### Penjelasan Parameter:
- `<username>`: Username akun database MongoDB Anda.
- `<password>`: Password akun database MongoDB Anda.
- `<cluster-url>`: Hostname cluster database (misal: `cluster0.abcde.mongodb.net` untuk MongoDB Atlas, atau `192.168.1.100:27017` untuk server lokal).
- `<nama-database>`: Nama database yang ingin digunakan (sistem akan otomatis membuat nama database dan koleksi di dalamnya jika belum ada).

---

## 3. Opsi Server MongoDB Online Gratis & Bagus

Jika saat ini Anda ingin menguji coba menggunakan MongoDB Online yang gratis, kuat, dan stabil, disarankan menggunakan **MongoDB Atlas** (layanan Cloud resmi dari MongoDB):

### Cara Membuat MongoDB Atlas Gratis (Tier M0):
1. Buka website resmi [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database).
2. Daftar akun baru secara gratis.
3. Buat sebuah **Database Deployment** baru, lalu pilih opsi **M0 (Free)** yg berkapasitas 512 MB (Sangat mumpuni untuk pengembangan dan ribuan data arsip).
4. Pilih penyedia cloud (GCP, AWS, atau Azure) dan region terdekat (misalnya Singapore atau Asia-Southeast).
5. Pada menu **Security -> Database Access**, buat pengguna database baru (Username & Password).
6. Pada menu **Security -> Network Access**, tambahkan alamat IP `0.0.0.0/0` (agar server Cloud Run bisa terhubung ke database).
7. Klik tombol **Connect**, pilih **Drivers (Node.js)**, lalu salin **Connection String** yang diberikan.
8. Tempel (*paste*) Connection String tersebut ke dalam variabel `MONGODB_URI` di file `.env` Anda.

---

## 4. Panduan Migrasi ke Jaringan Lokal (Local Area Network / LAN)

Setelah tahap pengembangan di Cloud selesai dan Anda ingin memindahkan seluruh aplikasi dan database ke server fisik di kantor Anda (Local Area Network), berikut adalah langkah-langkah detailnya:

### Langkah A: Persiapan Server Lokal (PC Utama Office)
1. **Pilih Komputer Server**: Siapkan satu PC di kantor yang akan bertindak sebagai Server Utama (OS Windows, Linux, atau macOS).
2. **Instal program pendukung di PC Server tersebut**:
   - Install **Node.js LTS** (versi 18 atau 20) dari [nodejs.org](https://nodejs.org/).
   - Install **MongoDB Community Server** gratis dari [MongoDB Download Center](https://www.mongodb.com/try/download/community).
   - Install **MongoDB Compass** (aplikasi GUI gratis untuk mengelola database secara visual).

### Langkah B: Konfigurasi MongoDB di Server Lokal agar Bisa Diakses PC Lain
Secara default, MongoDB di komputer lokal hanya bisa diakses oleh komputer itu sendiri (`localhost` atau `127.0.0.1`). Agar PC staff lain di ruangan kantor bisa terhubung:
1. Buka file konfigurasi MongoDB di server lokal Anda:
   - Di Windows: `C:\Program Files\MongoDB\Server\<versi>\bin\mongod.cfg`
   - Di Linux: `/etc/mongod.conf`
2. Cari baris `net:` dan ubah bagian `bindIp` agar mendengarkan semua IP port di jaringan kantor Anda:
   ```yaml
   net:
     port: 27017
     bindIp: 0.0.0.0
   ```
   *(Mengubah bindIp menjadi `0.0.0.0` mengizinkan akses dari alamat IP lokal manapun di jaringan Anda).*
3. **Restart layanan MongoDB**:
   - Di Windows: Buka program `Services.msc`, cari layanan **MongoDB Server**, lalu klik **Restart**.
   - Di Linux: Jalankan perintah `sudo systemctl restart mongod`.

### Langkah C: Deploy Aplikasi di PC Server Kantor
1. Unduh atau salin seluruh source code aplikasi ini ke PC Server kantor.
2. Di folder root aplikasi kantor, buat file `.env` baru:
   ```env
   NODE_ENV="production"
   MONGODB_URI="mongodb://127.0.0.1:27017/arsip-bpn"
   ```
3. Jalankan command terminal di folder aplikasi tersebut untuk menginstal package dan menjalankan aplikasi:
   ```bash
   npm install
   npm run build
   npm run start
   ```
   *(Aplikasi sekarang berjalan di PC Server kantor Anda pada port `3000`).*

### Langkah D: Cara Staff Mengakses Aplikasi Melalui Jaringan WiFi / Kabel LAN
1. Cek IP Address lokal dari PC Server Kantor (misal IP Server lokal Anda adalah `192.168.1.150`).
2. Staff di ruangan kantor yang terhubung ke modem WiFi/router yang sama tinggal membuka browser di komputer mereka dan mengetik alamat IP tersebut beserta portnya:
   ```html
   http://192.168.1.150:3000
   ```
3. Seluruh data transaksi, pencarian, dan pengelolaan arsip sekarang akan tersimpan dengan sangat cepat dan aman di server lokal kantor Anda, bebas dari ketergantungan koneksi internet publik!

---

## 5. Keunggulan MongoDB Untuk Data 1 Juta Arsip

MongoDB merupakan pilihan yang sangat tepat untuk menangani data besar hingga jutaan rekam dokumen arsip karena:
1. **Ukurannya Fleksibel**: Bentuk dokumen JSON bebas-skema (*schemaless*) mengizinkan beberapa arsip memiliki metadata berbeda tanpa merusak integritas tabel database.
2. **Kecepatan Indexing**: MongoDB memiliki fitur *Indexing* luar biasa pada kolom spesifik (seperti No Surat Ukur, Buku Tanah, Tahun, Kecamatan) sehingga proses pencarian sepermili-detik tetap terjamin walaupun data Anda sudah menyentuh angka jutaan.
3. **Backup Sangat Mudah**: Anda bisa mengekspor data jutaan arsip dengan cepat melalui satu baris command `mongodump` dan memulihkannya menggunakan `mongorestore`.
