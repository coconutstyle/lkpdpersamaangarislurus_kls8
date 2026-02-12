/* =========================================
   LOGIN.JS - LOGIKA HALAMAN DEPAN (UPDATE)
   ========================================= */

document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. FITUR SAPAAN WAKTU (PAGI/SIANG/SORE) ---
    const judul = document.querySelector('h1');
    const jam = new Date().getHours();
    let sapaan = "Halo,";
    let icon = "👋";

    if (jam >= 4 && jam < 11) { sapaan = "Selamat Pagi, Anak-anak!"; icon = "☀️"; }
    else if (jam >= 11 && jam < 15) { sapaan = "Selamat Siang, Anak-anak!"; icon = "🌤️"; }
    else if (jam >= 15 && jam < 19) { sapaan = "Selamat Sore, Anak-anak!"; icon = "🌇"; }
    else { sapaan = "Selamat Malam, Anak-anak!"; icon = "🌙"; }

    // Cek agar sapaan tidak dobel kalau di-refresh
    if (!document.getElementById('sapaan-waktu')) {
        const sapaanEl = document.createElement('div');
        sapaanEl.id = 'sapaan-waktu';
        sapaanEl.innerHTML = `<span style="font-size: 1.2rem;">${icon}</span> ${sapaan}`;
        sapaanEl.style.cssText = "color: #d35400; font-weight: 600; margin-bottom: 5px; font-size: 1.1rem; animation: fadeIn 2s;";
        judul.parentNode.insertBefore(sapaanEl, judul);
    }


    // --- 2. FITUR QUOTE BERGILIR (SETIAP 10 DETIK) ---
    const quotes = [
        "\"Matematika adalah bahasa alam semesta.\"",
        "\"Jangan takut salah, karena dari kesalahan kita belajar.\"",
        "\"Garis lurus butuh dua titik, kesuksesan butuh usaha dan doa.\"",
        "\"Masalah matematika mengajarkan kita bahwa setiap masalah pasti ada solusinya.\"",
        "\"Fokus, Teliti, dan Pantang Menyerah!\"",
        "\"Persamaan garis itu simpel, yang rumit itu alasanmu nunda tugas!\""
    ];

    let quoteIndex = 0;
    
    // Cari elemen subtitle untuk menaruh quote
    const subTitle = document.querySelector('p');
    
    // Buat elemen khusus quote
    const quoteEl = document.createElement('div');
    quoteEl.id = 'quote-box';
    quoteEl.style.cssText = "margin-top:15px; color:#2196F3; font-style:italic; font-size: 0.95rem; min-height: 40px; transition: opacity 1s ease-in-out;";
    
    // Pasang elemen quote di bawah sub-judul
    if(subTitle) {
        subTitle.appendChild(quoteEl);
    }

    // Fungsi Ganti Quote
    function updateQuote() {
        // 1. Fade Out (Hilang pelan-pelan)
        quoteEl.style.opacity = 0;

        setTimeout(() => {
            // 2. Ganti Teks saat sedang hilang
            quoteEl.innerText = quotes[quoteIndex];
            quoteIndex = (quoteIndex + 1) % quotes.length; // Loop kembali ke awal jika habis

            // 3. Fade In (Muncul pelan-pelan)
            quoteEl.style.opacity = 1;
        }, 1000); // Tunggu 1 detik (waktu animasi fade out)
    }

    // Jalankan pertama kali langsung
    quoteEl.innerText = quotes[0];
    quoteIndex++;

    // Set Interval ganti setiap 10.000 ms (10 detik)
    setInterval(updateQuote, 10000);


    // --- 3. EFEK KLIK TOMBOL ---
    const buttons = document.querySelectorAll('.btn-role');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            this.style.transform = "scale(0.95)";
            this.style.filter = "brightness(0.8)";
        });
    });
});

// --- SCRIPT JAM REALTIME ---
function updateLiveClock() {
    const now = new Date();
    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateString = now.toLocaleDateString('id-ID', optionsDate);
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false };
    const timeString = now.toLocaleTimeString('id-ID', optionsTime).replace(/\./g, ':');

    const tglEl = document.getElementById('tgl-hari');
    const jamEl = document.getElementById('jam-waktu');
    
    if(tglEl) tglEl.innerText = dateString;
    if(jamEl) jamEl.innerText = timeString;
}
setInterval(updateLiveClock, 1000);
document.addEventListener('DOMContentLoaded', updateLiveClock);