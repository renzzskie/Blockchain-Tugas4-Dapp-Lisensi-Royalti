# DApp Lisensi Hak Cipta dan Royalti (Sepolia)

Frontend untuk smart contract **LisensiRoyalti** (Bab 13): pendaftaran karya digital, penjualan lisensi, dan pembagian royalti otomatis 80% kreator utama dan 20% kolaborator. Dibangun dengan Vite, ethers.js v6, dan MetaMask pada jaringan uji Sepolia.

Tugas 4 Mata Kuliah Blockchain, Universitas Mataram.

| | |
|---|---|
| Nama | Rendy Wahyu Islami |
| NIM | f1d02410133 |
| Dosen pengampu | Heri Wijayanto, S.T., M.T., Ph.D. |

## Kontrak

| Item | Nilai |
|---|---|
| Jaringan | Sepolia testnet (chain ID 11155111) |
| Alamat kontrak | `0xdf9080938ACf1E54B789004C812D409f5C1Bc688` |
| Kode kontrak | [`contracts/Bab13_LisensiRoyalti.sol`](contracts/Bab13_LisensiRoyalti.sol) |
| Solidity | `^0.8.26` |

## Fitur

- Hubungkan MetaMask dan validasi jaringan Sepolia
- Baca data kontrak: kreator utama, jumlah karya, katalog karya, status lisensi, saldo royalti
- Daftarkan karya baru (khusus kreator utama)
- Beli lisensi (pembayaran sesuai harga karya)
- Tarik royalti (pola Pull-over-Push dan Checks-Effects-Interactions)
- Ubah status karya Aktif atau Dihentikan (khusus kreator utama)
- Sambung ulang otomatis saat akun atau jaringan MetaMask berganti

## Struktur proyek

| Berkas | Fungsi |
|---|---|
| `index.html` | Kerangka halaman |
| `style.css` | Tampilan |
| `config.js` | Alamat kontrak dan chain ID |
| `main.js` | Logika ethers.js (koneksi, baca, tulis, event dompet) |
| `package.json` | Dependensi dan script |
| `contracts/Bab13_LisensiRoyalti.sol` | Kode smart contract |

## Cara menjalankan

Prasyarat: Node.js (LTS), ekstensi MetaMask di Chrome, dan sedikit SepoliaETH dari faucet.

```bash
npm install
npm run dev
```

Buka `http://localhost:5173/`, pindahkan MetaMask ke jaringan **Sepolia**, lalu klik **Hubungkan MetaMask**.

## Catatan

- Harga karya pada fungsi `daftarkanKarya` dalam satuan **wei**; antarmuka menerima ETH desimal (misalnya `0.001`) dan mengonversinya otomatis.
- Repositori ini tidak menyimpan kunci privat maupun seed phrase.
