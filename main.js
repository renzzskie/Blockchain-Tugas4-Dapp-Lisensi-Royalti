import { ethers } from "ethers";
import { CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID } from "./config.js";

// ABI human-readable ethers v6: 5 fungsi view dan 4 fungsi mutasi state.
const ABI = [
  "function kreatorUtama() view returns (address)",
  "function jumlahKarya() view returns (uint256)",
  "function daftarKarya(uint256) view returns (string judul, string cidIPFS, address kolaborator, uint256 hargaLisensi, uint256 totalTerjual, uint8 status)",
  "function pemegangLisensi(uint256, address) view returns (bool)",
  "function saldoRoyalti(address) view returns (uint256)",
  "function daftarkanKarya(string judul, string cidIPFS, address kolaborator, uint256 hargaWei)",
  "function beliLisensi(uint256 idKarya) payable",
  "function tarikRoyalti()",
  "function ubahStatusKarya(uint256 idKarya, bool aktifkan)",
];

let provider, signer, contract, akun;
const $ = (id) => document.getElementById(id);

function info(pesan, tipe = "info") {
  const el = $("status");
  el.textContent = pesan;
  el.className = "status " + tipe;
}

function periksaAlamat() {
  if (!ethers.isAddress(CONTRACT_ADDRESS)) {
    throw new Error("CONTRACT_ADDRESS di config.js belum diisi alamat kontrak Sepolia yang valid.");
  }
}

async function periksaJaringan() {
  const net = await provider.getNetwork();
  $("network").textContent = `${net.name} (chainId ${net.chainId})`;
  if (net.chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error("MetaMask bukan pada Sepolia (chainId 11155111). Pindahkan jaringan lalu hubungkan ulang.");
  }
}

async function hubungkan() {
  try {
    periksaAlamat();
    if (!window.ethereum) throw new Error("MetaMask tidak ditemukan. Pasang ekstensi MetaMask.");
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    await periksaJaringan();
    signer = await provider.getSigner();
    akun = await signer.getAddress();
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    $("account").textContent = akun;
    await muatData();
  } catch (e) {
    contract = null;
    info("Gagal menghubungkan: " + (e.shortMessage || e.message), "error");
  }
}

function sel(teks) {
  const td = document.createElement("td");
  td.textContent = teks;
  return td;
}

async function muatData() {
  if (!contract) return info("Hubungkan MetaMask dulu.", "error");
  info("Membaca data dari Sepolia...");
  try {
    const [kreator, jumlah, saldo] = await Promise.all([
      contract.kreatorUtama(),
      contract.jumlahKarya(),
      contract.saldoRoyalti(akun),
    ]);
    $("kreator").textContent = kreator;
    $("jumlahKarya").textContent = jumlah.toString();
    $("saldo").textContent = `${ethers.formatEther(saldo)} ETH (${saldo} wei)`;

    const n = Number(jumlah);
    const baris = await Promise.all(
      Array.from({ length: n }, async (_, i) => {
        const [k, punya] = await Promise.all([contract.daftarKarya(i), contract.pemegangLisensi(i, akun)]);
        return { i, k, punya };
      })
    );

    const body = $("karyaBody");
    body.replaceChildren();
    if (n === 0) {
      const tr = document.createElement("tr");
      const td = sel("Belum ada karya terdaftar.");
      td.colSpan = 7;
      tr.append(td);
      body.append(tr);
    }
    for (const { i, k, punya } of baris) {
      const tr = document.createElement("tr");
      const aktif = Number(k.status) === 0;
      const tdStatus = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "badge " + (aktif ? "aktif" : "henti");
      badge.textContent = aktif ? "Aktif" : "Dihentikan";
      tdStatus.append(badge);
      tr.append(
        sel(i),
        sel(k.judul),
        sel(ethers.formatEther(k.hargaLisensi) + " ETH"),
        sel(k.totalTerjual.toString()),
        tdStatus,
        sel(k.kolaborator),
        sel(punya ? "Sudah memiliki" : "Belum")
      );
      body.append(tr);
    }
    info("Data berhasil dibaca dari Sepolia pada " + new Date().toLocaleTimeString("id-ID") + ".");
  } catch (e) {
    info("Gagal membaca data: " + (e.shortMessage || e.message), "error");
  }
}

// Membungkus semua transaksi tulis: konfirmasi MetaMask, tx.hash, lalu tx.wait().
async function kirimTx(label, fn) {
  if (!contract) return info("Hubungkan MetaMask dulu.", "error");
  try {
    info(`${label}: menunggu persetujuan di MetaMask...`);
    const tx = await fn();
    info(`Transaksi dikirim: ${tx.hash}. Menunggu konfirmasi blok...`);
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error("Transaksi tidak berhasil.");
    info(`Transaksi berhasil! Hash: ${tx.hash}`, "ok");
    await muatData();
    info(`Transaksi berhasil! Hash: ${tx.hash}`, "ok");
  } catch (e) {
    info("Transaksi gagal: " + (e.reason || e.shortMessage || e.message), "error");
  }
}

$("connectBtn").addEventListener("click", hubungkan);
$("reloadBtn").addEventListener("click", muatData);

$("formDaftar").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const judul = $("judul").value.trim();
  const cid = $("cid").value.trim();
  const kolab = $("kolaborator").value.trim();
  let hargaWei;
  try {
    hargaWei = ethers.parseEther($("harga").value);
  } catch {
    return info("Harga tidak valid. Gunakan angka, contoh 0.001.", "error");
  }
  if (!judul || !cid) return info("Judul dan tautan IPFS wajib diisi.", "error");
  if (!ethers.isAddress(kolab)) return info("Alamat kolaborator tidak valid.", "error");
  if (hargaWei <= 0n) return info("Harga harus lebih dari 0.", "error");
  kirimTx("daftarkanKarya", () => contract.daftarkanKarya(judul, cid, kolab, hargaWei));
});

$("formBeli").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!contract) return info("Hubungkan MetaMask dulu.", "error");
  const id = BigInt($("idBeli").value);
  try {
    const k = await contract.daftarKarya(id); // harga dibaca dari kontrak
    await kirimTx("beliLisensi", () => contract.beliLisensi(id, { value: k.hargaLisensi }));
  } catch (e) {
    info("Karya tidak ditemukan atau gagal dibaca: " + (e.shortMessage || e.message), "error");
  }
});

$("tarikBtn").addEventListener("click", () => kirimTx("tarikRoyalti", () => contract.tarikRoyalti()));

$("formStatus").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const id = BigInt($("idStatus").value);
  const aktifkan = $("statusBaru").value === "true";
  kirimTx("ubahStatusKarya", () => contract.ubahStatusKarya(id, aktifkan));
});

// Saat akun atau jaringan benar-benar berubah, sambungkan ulang otomatis.
if (window.ethereum) {
  window.ethereum.on("accountsChanged", (daftar) => {
    // Abaikan event saat koneksi awal atau jika akunnya sama.
    if (!akun || !daftar.length || daftar[0].toLowerCase() === akun.toLowerCase()) return;
    contract = null;
    akun = null;
    info("Akun berubah. Menyambungkan ulang...");
    hubungkan();
  });
  window.ethereum.on("chainChanged", () => {
    if (!akun) return;
    contract = null;
    info("Jaringan berubah. Menyambungkan ulang...");
    hubungkan();
  });

  // Sambung otomatis jika situs sudah diizinkan di MetaMask.
  window.ethereum
    .request({ method: "eth_accounts" })
    .then((daftar) => {
      if (daftar.length) hubungkan();
    })
    .catch(() => {});
}