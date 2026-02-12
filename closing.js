// Cek apakah siswa benar-benar sudah submit
if (!localStorage.getItem('submitted')) {
    alert("Kamu belum mengerjakan LKPD!");
    window.location.href = 'index.html';
}

// Mencegah tombol back browser
history.pushState(null, null, location.href);
window.onpopstate = function () {
    history.go(1);
};

// --- FITUR UTAMA: LIHAT JAWABAN SAYA ---
function lihatHasilSaya() {
    // 1. PRIORITAS: Ambil nomor kelompok dari key 'kelompok-siswa' 
    // Key ini diatur otomatis oleh file lkpdkelX.js saat submit
    let kelompok = localStorage.getItem('kelompok-siswa');
    
    console.log('[DEBUG] Kelompok dari localStorage:', kelompok);

    // 2. FALLBACK: Jika key di atas kosong, cari manual di data review
    if (!kelompok) {
        for (let i = 1; i <= 5; i++) {
            if (localStorage.getItem(`dataReviewSiswa_Kel${i}`)) {
                kelompok = i;
                console.log('[DEBUG] Kelompok ditemukan manual:', i);
                break;
            }
        }
    }

    // 3. Validasi: Jika masih tidak ketemu
    if (!kelompok) {
        alert("Data kelompok tidak ditemukan. Silakan login ulang.");
        window.location.href = 'index.html';
        return;
    }

    // 4. Arahkan ke file HTML sesuai kelompok dengan mode review
    const reviewUrl = `lkpdkel${kelompok}.html?mode=review`;
    console.log('[DEBUG] Redirecting to:', reviewUrl);
    window.location.href = reviewUrl;
}

// Fungsi toggleReview (opsional, jika kamu masih ingin tabel ringkasan muncul)
function toggleReview() {
    const area = document.getElementById('reviewArea');
    if (!area) {
        lihatHasilSaya();
        return;
    }
    
    if (area.style.display === 'none') {
        area.style.display = 'block';
        loadReviewData();
    } else {
        area.style.display = 'none';
    }
}

// Fungsi loadReviewData disesuaikan agar mengikuti logika kelompok yang sama
function loadReviewData() {
    const tableBody = document.getElementById('reviewTableBody');
    let kelompok = localStorage.getItem('kelompok-siswa');
    
    // Cari manual jika kelompok-siswa tidak ada
    if (!kelompok) {
        for (let i = 1; i <= 5; i++) {
            if (localStorage.getItem(`dataReviewSiswa_Kel${i}`)) {
                kelompok = i;
                break;
            }
        }
    }

    const rawData = localStorage.getItem(`dataReviewSiswa_Kel${kelompok}`);
    if (!rawData) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Data tidak ditemukan.</td></tr>';
        return;
    }

    const data = JSON.parse(rawData);
    let htmlContent = '';

    data.forEach(item => {
        if (item.question === 'Info Kelompok' || item.question === 'Grafik Chart') return;
        
        let statusIcon = item.is_correct ? 
            '<i class="fa-solid fa-check-circle" style="color: green;"></i>' : 
            '<i class="fa-solid fa-times-circle" style="color: red;"></i>';
            
        htmlContent += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${item.question}</td>
                <td style="padding: 8px;">${item.answer || '-'}</td>
                <td style="padding: 8px; text-align: center;">${statusIcon}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = htmlContent;
}