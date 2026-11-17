// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract LisensiRoyalti {
    address public immutable kreatorUtama;

    enum StatusKarya { Aktif, Dihentikan }

    struct KaryaDigital {
        string judul;
        string cidIPFS;      // berisi tautan ipfs://<CID>
        address kolaborator;
        uint256 hargaLisensi;
        uint256 totalTerjual;
        StatusKarya status;
    }

    KaryaDigital[] public daftarKarya;

    // Nested mapping: idKarya => (alamatPembeli => statusLisensi)
    mapping(uint256 => mapping(address => bool)) public pemegangLisensi;

    // Saldo royalti yang siap ditarik (pola Pull-over-Push)
    mapping(address => uint256) public saldoRoyalti;

    event KaryaTerdaftar(uint256 indexed idKarya, string judul, string cidIPFS, uint256 hargaWei);
    event LisensiDibeli(uint256 indexed idKarya, address indexed pembeli, uint256 nominalWei);
    event RoyaltiDitarik(address indexed penerima, uint256 jumlahWei);
    event StatusKaryaDiubah(uint256 indexed idKarya, StatusKarya statusBaru);

    constructor() {
        kreatorUtama = msg.sender;
    }

    modifier hanyaKreator() {
        require(msg.sender == kreatorUtama, "Bukan kreator utama");
        _;
    }

    // Harga diberikan dalam wei agar bisa pecahan ETH (cocok untuk saldo faucet Sepolia)
    function daftarkanKarya(
        string calldata judul,
        string calldata cidIPFS,
        address kolaborator,
        uint256 hargaWei
    ) external hanyaKreator {
        require(bytes(judul).length > 0, "Judul kosong");
        require(bytes(cidIPFS).length > 0, "CID kosong");
        require(kolaborator != address(0), "Alamat kolaborator nol");
        require(hargaWei > 0, "Harga harus lebih dari 0");

        daftarKarya.push(KaryaDigital({
            judul: judul,
            cidIPFS: cidIPFS,
            kolaborator: kolaborator,
            hargaLisensi: hargaWei,
            totalTerjual: 0,
            status: StatusKarya.Aktif
        }));

        emit KaryaTerdaftar(daftarKarya.length - 1, judul, cidIPFS, hargaWei);
    }

    function beliLisensi(uint256 idKarya) external payable {
        require(idKarya < daftarKarya.length, "Karya tidak ditemukan");
        KaryaDigital storage karya = daftarKarya[idKarya];

        require(karya.status == StatusKarya.Aktif, "Lisensi karya dihentikan");
        require(!pemegangLisensi[idKarya][msg.sender], "Sudah memiliki lisensi");
        require(msg.value == karya.hargaLisensi, "ETH tidak sesuai harga lisensi");

        pemegangLisensi[idKarya][msg.sender] = true;
        karya.totalTerjual += 1;

        // Pembagian royalti: 80% kreator utama, 20% kolaborator
        uint256 bagianKolaborator = (msg.value * 20) / 100;
        uint256 bagianKreator = msg.value - bagianKolaborator; // sisa pembulatan masuk kreator

        saldoRoyalti[karya.kolaborator] += bagianKolaborator;
        saldoRoyalti[kreatorUtama] += bagianKreator;

        emit LisensiDibeli(idKarya, msg.sender, msg.value);
    }

    function tarikRoyalti() external {
        uint256 jumlah = saldoRoyalti[msg.sender];
        require(jumlah > 0, "Saldo royalti kosong");            // Checks

        saldoRoyalti[msg.sender] = 0;                            // Effects

        (bool sukses, ) = payable(msg.sender).call{value: jumlah}(""); // Interactions
        require(sukses, "Gagal mencairkan royalti");

        emit RoyaltiDitarik(msg.sender, jumlah);
    }

    function ubahStatusKarya(uint256 idKarya, bool aktifkan) external hanyaKreator {
        require(idKarya < daftarKarya.length, "Karya tidak ditemukan");
        StatusKarya baru = aktifkan ? StatusKarya.Aktif : StatusKarya.Dihentikan;
        daftarKarya[idKarya].status = baru;
        emit StatusKaryaDiubah(idKarya, baru);
    }

    function jumlahKarya() external view returns (uint256) {
        return daftarKarya.length;
    }
}
