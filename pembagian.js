function simpanDanMasuk() {
    // 1. Ambil nilai kelompok yang dipilih siswa
    const kelompok = document.getElementById('pilihanKelompok').value;

    // 2. Validasi: Pastikan siswa sudah memilih
    if (kelompok === "") {
        alert("Mohon pilih kelompok terlebih dahulu!");
        return;
    }

    // 3. Simpan ke LocalStorage
    // Ini penting agar nanti nama kelompok muncul otomatis di pojok kanan atas LKPD
    localStorage.setItem('kelompok-siswa', kelompok);

    // 4. Logika Arahkan Halaman (Redirect)
    // Sesuaikan nama file tujuan di sini
    switch (kelompok) {
        case "1":
            window.location.href = 'lkpdkel1.html'; // Masuk ke soal Bensin
            break;
        case "2":
            window.location.href = 'lkpdkel2.html'; // Masuk ke soal Percetakan
            break;
        case "3":
            // Pastikan file lkpd.html yang asli (Listrik) sudah kamu rename jadi lkpd_3.html
            // Atau ganti baris ini menjadi: window.location.href = 'lkpd.html';
            window.location.href = 'lkpdkel3.html'; 
            break;
        case "4":
            window.location.href = 'lkpdkel4.html'; // Masuk ke soal Taksi
            break;
        case "5":
            window.location.href = 'lkpdkel5.html'; // Masuk ke soal Katering
            break;
        default:
            alert("Terjadi kesalahan pilihan.");
            break;
    }
}