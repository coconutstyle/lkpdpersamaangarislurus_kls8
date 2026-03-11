function simpanDanMasuk() {
    // 1. Ambil nilai kelompok yang dipilih siswa
    const kelompok = document.getElementById('pilihanKelompok').value;

    // 2. Validasi: Pastikan siswa sudah memilih
    if (kelompok === "") {
        alert("Mohon pilih kelompok terlebih dahulu!");
        return;
    }

    // 3. Simpan ke LocalStorage
    localStorage.setItem('kelompok-siswa', kelompok);

    // 4. Arahkan ke halaman LKPD sesuai kelompok
    switch (kelompok) {
        case "1":
            window.location.href = 'lkpdkel1.html';
            break;
        case "2":
            window.location.href = 'lkpdkel2.html';
            break;
        case "3":
            window.location.href = 'lkpdkel3.html';
            break;
        case "4":
            window.location.href = 'lkpdkel4.html';
            break;
        case "5":
            window.location.href = 'lkpdkel5.html';
            break;
        case "6":
            window.location.href = 'lkpdkel6.html'; // Kolam Renang
            break;
        case "7":
            window.location.href = 'lkpdkel7.html'; // Tinta Pulpen
            break;
        case "8":
            window.location.href = 'lkpdkel8.html'; // Harga Emas
            break;
        default:
            alert("Terjadi kesalahan pilihan.");
            break;
    }
}