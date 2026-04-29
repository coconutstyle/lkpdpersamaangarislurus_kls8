// =========================================
// 1. SETUP & UTILITY (GLOBAL)
// =========================================

const supabaseUrl = 'https://cydgsvqybhhfedoazfok.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGdzdnF5YmhoZmVkb2F6Zm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDc5ODAsImV4cCI6MjA4MzQyMzk4MH0.4p4It2z4qVyLNydXwNdOHx9es7R5zAbB-EevFZVk5Y8'; 
let supabaseClient;
try {
    supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
} catch (error) {
    console.error('Error initializing Supabase:', error);
    supabaseClient = null;
}

// [PENTING] Variabel Global
window.simpanTitik = [];
window.myChart = null;

// Fungsi untuk menyimpan input ke localStorage
function saveInputValue(id) {
    const element = document.getElementById(id);
    if (element) localStorage.setItem(id, element.value);
}

// Fungsi untuk memuat input dari localStorage
function loadInputValue(id) {
    const value = localStorage.getItem(id);
    const element = document.getElementById(id);
    if (element && value !== null) element.value = value;
}

function initDateTime() {
    const now = new Date();
    const tanggalEl = document.getElementById('tanggal');
    if (tanggalEl) tanggalEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// =========================================
// 2. MAIN LOGIC (CHART & REVIEW MODE)
// =========================================

document.addEventListener('DOMContentLoaded', function() {
    // --- DAFTAR ID YANG HARUS DISIMPAN OTOMATIS ---
    const inputIds = [
        'kelompok-siswa', 'nama-siswa',
        'diskusi-alasan-strategi', 'diskusi-variabel',
        'coordAx', 'coordAy', 'coordBx', 'coordBy',
        'jawab_metode1', 'jawab_gradien', 'jawab_metode2',
        'jawab_kesimpulan',
        'jawab5', 'jawab6',
        'devAnswer1', 'devAnswer2',
        'kesimpulan1', 'kesimpulan2'
    ];
    inputIds.forEach(id => loadInputValue(id));

    // Load radio button pilihan strategi
    const savedStrategi = localStorage.getItem('pilih-strategi');
    if (savedStrategi) {
        const radioEl = document.querySelector(`input[name="pilih-strategi"][value="${savedStrategi}"]`);
        if (radioEl) radioEl.checked = true;
    }

    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => saveInputValue(id));
            el.addEventListener('change', () => saveInputValue(id));
        }
    });

    // Simpan otomatis radio button pilihan strategi
    document.querySelectorAll('input[name="pilih-strategi"]').forEach(radio => {
        radio.addEventListener('change', () => {
            localStorage.setItem('pilih-strategi', radio.value);
        });
    });

    initDateTime();

    // 1. TAMPILAN KELOMPOK
    const elSelect = document.getElementById('kelompok-siswa');
    if (elSelect) {
        const textSpan = document.createElement('div');
        textSpan.innerHTML = `<strong>Kelompok 5</strong>`;
        textSpan.style.cssText = "text-align: left; width: 100%; color: #333; padding: 10px 0; font-size: 1rem;";
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden'; hiddenInput.id = 'kelompok-siswa'; hiddenInput.value = '5';
        if (elSelect.parentNode) {
            elSelect.parentNode.replaceChild(textSpan, elSelect);
            textSpan.parentNode.appendChild(hiddenInput);
        }
    }

    // 2. INISIALISASI GRAFIK
    const ctx = document.getElementById('myChart');
    if (ctx && typeof Chart !== 'undefined') {
        const chartCtx = ctx.getContext('2d');
        let existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();

        window.myChart = new Chart(chartCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Tarif Catering (Ribu Rp)',
                    data: [], 
                    backgroundColor: '#5D4037', // Warna Cokelat Catering
                    borderColor: '#795548',
                    pointRadius: 8,
                    pointHoverRadius: 12,
                    showLine: true, borderWidth: 2, tension: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (e) => {
                    // Cek Mode Review
                    if (document.body.classList.contains('review-mode-active')) return;

                    const activeChart = myChart;
                    if (!activeChart) return;

                    const elements = activeChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                    if (elements.length > 0) return;

                    const rect = activeChart.canvas.getBoundingClientRect();
                    const xVal = Math.round(activeChart.scales.x.getValueForPixel(e.native.clientX - rect.left));
                    const yVal = Math.round(activeChart.scales.y.getValueForPixel(e.native.clientY - rect.top) / 10) * 10;
                    
                    // Simpan ke Variabel Global
                    window.simpanTitik.push({ x: xVal, y: yVal });
                    
                    const label = String.fromCharCode(65 + activeChart.data.datasets[0].data.length);
                    activeChart.data.datasets[0].data.push({ x: xVal, y: yVal, label: label });
                    activeChart.update();
                    
                    const feedback = document.getElementById('graphFeedback');
                    if(feedback) feedback.innerHTML = ''; 
                    
                    // Note: checkGraphPoints() DIHAPUS dari sini agar tidak otomatis muncul jawaban
                },
                scales: {
                    x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Jumlah Kotak', font: {weight:'bold'} }, min: 0, max: 100, ticks: { stepSize: 10 } },
                    y: { title: { display: true, text: 'Total Biaya (Ribu Rp)', font: {weight:'bold'} }, min: 300, max: 1000, ticks: { stepSize: 50 } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (c) => ` ${c.raw.label}: (${c.parsed.x}, ${c.parsed.y})` } },
                    datalabels: { display: true, color: 'white', font: { weight: 'bold' }, formatter: (v) => v.label }
                }
            }
        });
    }

    // =========================================
    // MODE REVIEW (SISWA & GURU)
    // =========================================
    const urlParams = new URLSearchParams(window.location.search);
    const isReviewMode = urlParams.get('mode') === 'review';
    const siswaName = urlParams.get('siswa'); // Nama siswa dari URL (untuk guru)

    if (isReviewMode) {
        document.body.classList.add('review-mode-active');
        
        // Banner MODE REVIEW (kuning) - hanya untuk siswa, bukan guru
        if (!siswaName) {
            const reviewBanner = document.createElement('div');
            reviewBanner.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; background: #FFC107; color: #333; text-align: center; padding: 12px; font-weight: bold; font-size: 16px; z-index: 10000; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
            reviewBanner.innerHTML = '<i class="fa-solid fa-eye"></i> MODE REVIEW: Jawaban Anda telah tersimpan.';
            document.body.prepend(reviewBanner);
            document.body.style.paddingTop = '50px';
            setupOnlineComments();
        }
        
        setTimeout(async () => {
            let dataToLoad = null;
            
            // ===================================================
            // MODE 1: GURU (Ada parameter ?siswa=NamaSiswa)
            // ===================================================
            if (siswaName && supabaseClient) {
                try {
                    console.log('[GURU MODE] Loading data untuk siswa:', siswaName);
                    const decodedName = decodeURIComponent(siswaName);
                    
                    const { data, error } = await supabaseClient
                        .from('student_answers')
                        .select('*')
                        .eq('student_name', decodedName)
                        .order('id', { ascending: true });
                    
                    if (error) {
                        console.error('[GURU MODE] Error:', error);
                        alert('Gagal memuat data siswa: ' + error.message);
                    } else if (data && data.length > 0) {
                        console.log('[GURU MODE] Data ditemukan:', data.length, 'items');
                        dataToLoad = data;
                    } else {
                        console.warn('[GURU MODE] Tidak ada data untuk siswa:', decodedName);
                        alert('Tidak ada data untuk siswa: ' + decodedName);
                    }
                } catch(e) {
                    console.error('[GURU MODE] Exception:', e);
                }
            } 
            // ===================================================
            // MODE 2: SISWA (Tidak ada parameter ?siswa)
            // Prioritas: localStorage > Supabase
            // ===================================================
            else {
                console.log('[SISWA MODE] Memuat data...');
                
                // [PRIORITAS 1] Coba dari localStorage dulu (lebih cepat)
                const rawData = localStorage.getItem('dataReviewSiswa_Kel5');
                
                if (rawData) {
                    try {
                        const data = JSON.parse(rawData);
                        console.log('[SISWA MODE] Data ditemukan di localStorage:', data.length, 'items');
                        
                        // Validasi kelompok
                        const kelompokData = data.find(item => item.question === 'Info Kelompok');
                        if (kelompokData && kelompokData.answer === '5') {
                            dataToLoad = data;
                            console.log('[SISWA MODE] ✅ Data localStorage valid untuk Kelompok 5');
                        } else {
                            console.warn('[SISWA MODE] ⚠️ Data localStorage bukan untuk Kelompok 5');
                        }
                    } catch(e) { 
                        console.error('[SISWA MODE] Error parsing localStorage:', e); 
                    }
                }
                
                // [PRIORITAS 2] Jika localStorage kosong/gagal, coba Supabase
                if (!dataToLoad) {
                    const studentNameFromStorage = localStorage.getItem('nama-siswa');
                    
                    if (studentNameFromStorage && supabaseClient) {
                        try {
                            console.log('[SISWA MODE] localStorage kosong, coba Supabase untuk:', studentNameFromStorage);
                            
                            const { data, error } = await supabaseClient
                                .from('student_answers')
                                .select('*')
                                .eq('student_name', studentNameFromStorage)
                                .order('id', { ascending: true });
                            
                            if (error) {
                                console.error('[SISWA MODE] Supabase error:', error);
                            } else if (data && data.length > 0) {
                                // Validasi kelompok
                                const kelompokData = data.find(item => item.question === 'Info Kelompok');
                                if (kelompokData && kelompokData.answer === '5') {
                                    dataToLoad = data;
                                    console.log('[SISWA MODE] ✅ Data Supabase valid:', data.length, 'items');
                                } else {
                                    console.warn('[SISWA MODE] ⚠️ Data Supabase bukan untuk Kelompok 5');
                                }
                            } else {
                                console.warn('[SISWA MODE] Tidak ada data di Supabase untuk:', studentNameFromStorage);
                            }
                        } catch(e) {
                            console.error('[SISWA MODE] Supabase exception:', e);
                        }
                    } else {
                        console.warn('[SISWA MODE] Tidak ada nama siswa di localStorage atau Supabase tidak tersedia');
                    }
                }
                
                // [HASIL AKHIR]
                if (!dataToLoad) {
                    console.error('[SISWA MODE] ❌ Data tidak ditemukan di localStorage maupun Supabase');
                    alert('Data tidak ditemukan. Pastikan Anda sudah submit jawaban.');
                }
            }
            
            // ===================================================
            // ISI FORMULIR & DISABLE INPUT
            // ===================================================
            if (dataToLoad) {
                isiFormulirOtomatis(dataToLoad);
                disableInputs();
                tampilkanStatusJawaban(dataToLoad);
            }
        }, 500);
    }
});


// =========================================
// 3. FITUR KOMENTAR ONLINE
// =========================================

function setupOnlineComments() {
    const section = document.createElement('div');
    section.id = 'comment-section';
    section.style.cssText = "width: 90%; max-width: 800px; margin: 30px auto 100px; background: #fff; padding: 25px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-top: 5px solid #E65100;";
    section.innerHTML = `
        <h3 style="margin-top:0; color:#E65100;"><i class="fa-solid fa-comments"></i> Tanggapan Teman & Guru</h3>
        <p style="font-size:0.9rem; color:#666;">Feedback ini tersimpan online dan bisa dilihat oleh kelompok presentasi.</p>
        
        <div id="comments-list" style="max-height:300px; overflow-y:auto; margin-bottom:20px; padding-right:10px; border-bottom:1px solid #eee;">
            <p style="text-align:center; color:#ccc;">Belum ada tanggapan.</p>
        </div>

        <div style="background:#f5f5f5; padding:15px; border-radius:10px;">
            <input type="text" id="commentName" placeholder="Nama Kamu / Kelompok" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:5px;">
            <textarea id="commentText" rows="3" placeholder="Tulis tanggapan..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px; resize:vertical;"></textarea>
            <button id="btnSaveComment" onclick="sendCommentToSupabase()" style="margin-top:10px; background:#E65100; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold; width:100%;">
                <i class="fa-solid fa-paper-plane"></i> Kirim Tanggapan
            </button>
        </div>
    `;
    document.body.appendChild(section);
    document.body.style.paddingBottom = "100px";

    loadCommentsFromSupabase();
    setInterval(loadCommentsFromSupabase, 5000); 
}

async function sendCommentToSupabase() {
    const name = document.getElementById('commentName').value.trim();
    const text = document.getElementById('commentText').value.trim();

    console.log('[KOMENTAR] Mencoba kirim komentar:', { name, text });

    if (!name || !text) { 
        alert("Nama dan Pesan harus diisi!"); 
        return; 
    }
    
    if (supabaseClient) {
        console.log('[KOMENTAR] Supabase client tersedia, mengirim...');
        
        const { data, error } = await supabaseClient.from('student_answers').insert([{
            student_name: name, 
            question: 'KOMENTAR_KEL_5', 
            answer: text, 
            is_correct: false 
        }]).select();

        if (error) {
            console.error('[KOMENTAR] Error:', error);
            alert("Gagal kirim: " + error.message);
        } else {
            console.log('[KOMENTAR] Berhasil terkirim!', data);
            
            // [FITUR HAPUS] Simpan ID komentar ke localStorage
            if (data && data.length > 0) {
                const commentId = data[0].id;
                let myComments = JSON.parse(localStorage.getItem('myComments_Kel5') || '[]');
                myComments.push(commentId);
                localStorage.setItem('myComments_Kel5', JSON.stringify(myComments));
                console.log('[KOMENTAR] ID tersimpan di localStorage:', commentId);
            }
            
            document.getElementById('commentText').value = ''; 
            loadCommentsFromSupabase(); 
            alert("Tanggapan terkirim!");
        }
    } else {
        console.error('[KOMENTAR] Supabase client tidak tersedia!');
        alert("Error: Koneksi database tidak tersedia. Coba refresh halaman.");
    }
}

async function loadCommentsFromSupabase() {
    console.log('[KOMENTAR] Memuat komentar dari Supabase...');
    
    if (!supabaseClient) {
        console.error('[KOMENTAR] Supabase client tidak tersedia untuk load!');
        return;
    }

    const { data, error } = await supabaseClient
        .from('student_answers')
        .select('*')
        .eq('question', 'KOMENTAR_KEL_5')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[KOMENTAR] Error loading:', error);
        return;
    }

    console.log('[KOMENTAR] Data diterima:', data ? data.length + ' komentar' : 'null');

    if (data) {
        const list = document.getElementById('comments-list');
        if (data.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#ccc;">Belum ada tanggapan.</p>';
            return;
        }

        // [FITUR HAPUS] Ambil list ID komentar milik user dari localStorage
        const myComments = JSON.parse(localStorage.getItem('myComments_Kel5') || '[]');

        let html = '';
        data.forEach(item => {
            const time = new Date(item.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
            
            // [FITUR HAPUS] Cek apakah komentar ini milik user
            const isMyComment = myComments.includes(item.id);
            const deleteButton = isMyComment 
                ? `<button onclick="deleteComment(${item.id})" style="background:#dc3545; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:0.75rem; margin-left:10px;">
                     <i class="fa-solid fa-trash"></i> Hapus
                   </button>` 
                : '';
            
            html += `
                <div style="background:white; margin-bottom:10px; padding:10px; border-radius:8px; border:1px solid #eee;">
                    <div style="font-weight:bold; color:#E65100; display:flex; justify-content:space-between; align-items:center;">
                        <span><i class="fa-solid fa-user-circle"></i> ${item.student_name}</span>
                        <span style="font-size:0.8rem; color:#999;">${time}${deleteButton}</span>
                    </div>
                    <div style="color:#333; margin-top:5px;">${item.answer}</div>
                </div>
            `;
        });
        list.innerHTML = html;
        console.log('[KOMENTAR] Tampilan komentar diupdate');
    }
}

// [FITUR HAPUS] Fungsi untuk menghapus komentar
async function deleteComment(commentId) {
    if (!confirm('Yakin ingin menghapus komentar ini?')) {
        return;
    }

    console.log('[KOMENTAR] Mencoba hapus komentar ID:', commentId);

    if (!supabaseClient) {
        alert('Error: Koneksi database tidak tersedia.');
        return;
    }

    // Hapus dari Supabase
    const { error } = await supabaseClient
        .from('student_answers')
        .delete()
        .eq('id', commentId);

    if (error) {
        console.error('[KOMENTAR] Error hapus:', error);
        alert('Gagal menghapus komentar: ' + error.message);
    } else {
        console.log('[KOMENTAR] Komentar berhasil dihapus');
        
        // Hapus ID dari localStorage
        let myComments = JSON.parse(localStorage.getItem('myComments_Kel5') || '[]');
        myComments = myComments.filter(id => id !== commentId);
        localStorage.setItem('myComments_Kel5', JSON.stringify(myComments));
        
        // Reload komentar
        loadCommentsFromSupabase();
        alert('Komentar berhasil dihapus!');
    }
}

// =========================================
// 4. FUNGSI LOGIKA (GLOBAL SCOPE)
// =========================================

// --- Time & Date ---
document.addEventListener('DOMContentLoaded', function() {
    const now = new Date();
    if(document.getElementById('tanggal')) {
        document.getElementById('tanggal').textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    function updateTime() { 
        if(document.getElementById('waktu')) {
            document.getElementById('waktu').textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); 
        }
    }
    updateTime(); setInterval(updateTime, 1000);
});

// --- Isi Formulir (Review) ---
function isiFormulirOtomatis(data) {
    const dataSiswa = data.find(item => item.student_name && item.student_name !== 'Tanpa Nama');
    if (dataSiswa) document.getElementById('nama-siswa').value = dataSiswa.student_name;

    const mapSoal = {
        'Pilihan Strategi': null, // ditangani khusus (radio button)
        'Alasan Strategi': 'diskusi-alasan-strategi',
        'Identifikasi Variabel': 'diskusi-variabel',
        'Metode Karyawan B': 'jawab_metode1', 'Gradien Karyawan A': 'jawab_gradien', 'Metode Karyawan A': 'jawab_metode2',
        'Kesimpulan': 'jawab_kesimpulan', 'Alasan Kesimpulan': 'reasonText', 'Persamaan Final': 'finalEquation',
        'Biaya 84 Nasi Kotak': 'jawab5', 'Maksimal Nasi Kotak': 'jawab6',
        'Info Kelompok': 'kelompok-siswa', 'Analisis Rumus': 'devAnswer1', 'Pendapat Kelompok': 'devAnswer2',
        'Link Presentasi': 'link_presentasi'
    };

    data.forEach(item => {
        // Restore radio button pilihan strategi
        if (item.question === 'Pilihan Strategi') {
            const radioEl = document.querySelector(`input[name="pilih-strategi"][value="${item.answer}"]`);
            if (radioEl) radioEl.checked = true;
            return;
        }

        if (item.question === 'Visualisasi Grafik Kartesius') {
            try { 
                const points = JSON.parse(item.answer);
                window.simpanTitik = points; 
                if (window.myChart) {
                    window.myChart.data.datasets[0].data = points.map((p, index) => ({
                        x: p.x, y: p.y, label: String.fromCharCode(65 + index)
                    }));
                    window.myChart.update();
                }
            } catch(e) {}
        }
        
        let id = mapSoal[item.question];
        if (id) {
            let el = document.getElementById(id);
            if (el) {
                el.value = item.answer;
                if (item.is_correct === true) el.style.backgroundColor = '#d4edda';
                else if (item.is_correct === false) el.style.backgroundColor = '#f8d7da';
                if (item.question === 'Kesimpulan' && item.answer === 'Ya') {
                    const s = document.getElementById('finalEquationSection');
                    if (s) s.classList.remove('hidden');
                }
                if (item.question === 'Kesimpulan' && item.answer === 'Tidak') {
                    const s = document.getElementById('reasonSection');
                    if (s) s.classList.remove('hidden');
                }

                
                if (item.question === 'Link Presentasi') {
                    if (!el.parentNode.querySelector('a.btn-buka-link')) {
                        const btnOpen = document.createElement('a');
                        btnOpen.href = item.answer; btnOpen.target = "_blank";
                        btnOpen.className = 'btn-buka-link';
                        btnOpen.innerHTML = '<i class="fa-solid fa-external-link-alt"></i> Buka Link';
                        btnOpen.style.cssText = "display:block; margin-top:5px; padding:5px; background:#2196F3; color:white; text-align:center; border-radius:5px; text-decoration:none;";
                        el.parentNode.appendChild(btnOpen);
                    }
                }
            }
        }
        
        if (item.question === 'Koordinat A') { const match = item.answer.match(/-?\d+/g); if(match) { document.getElementById('coordAx').value = match[0]; document.getElementById('coordAy').value = match[1]; } }
        if (item.question === 'Koordinat B') { const match = item.answer.match(/-?\d+/g); if(match) { document.getElementById('coordBx').value = match[0]; document.getElementById('coordBy').value = match[1]; } }
    });
}

// --- Fungsi Show Review Banner ---

// --- Matikan Input (Fungsi yang sebelumnya hilang) ---
function disableInputs() {
    document.querySelectorAll('input, select, textarea, button').forEach(el => {
        // Filter ID yang boleh aktif (Komentar & Navigasi)
        if (el.id !== 'btnKembaliClosing' && 
            el.id !== 'commentName' && 
            el.id !== 'commentText' && 
            el.id !== 'btnSaveComment' &&
            !el.closest('#comment-section') &&
            !el.classList.contains('swal2-confirm')) {
            
            el.disabled = true;
            el.style.borderColor = '#ccc';
        }
    });
    const btnSubmit = document.getElementById('btnFinalSubmit');
    if(btnSubmit) btnSubmit.style.display = 'none';

    // Hanya buat tombol jika belum ada
    if (!document.getElementById('btnKembaliClosing')) {
        const floatingBtn = document.createElement('button');
        floatingBtn.id = 'btnKembaliClosing';
        floatingBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Kembali ke Penutup';
        floatingBtn.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #333; color: white; padding: 15px 25px; border-radius: 50px; border: none; font-size: 1rem; cursor: pointer; z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.3);";
        floatingBtn.onclick = function() { window.location.href = 'closing.html'; };
        document.body.appendChild(floatingBtn);
    }
    
    if (window.myChart) {
        window.myChart.options.plugins.tooltip.enabled = false;
        window.myChart.update();
    }
}

// --- FUNGSI INTERAKSI ---

function toggleHint(id) {
    const hintElement = document.getElementById('hint' + id);
    const btn = document.querySelector(`.btn-hint[onclick="toggleHint('${id}')"]`);
    if (hintElement.classList.contains('hidden')) {
        hintElement.classList.remove('hidden');
        btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Tutup';
    } else {
        hintElement.classList.add('hidden');
        btn.innerHTML = '<i class="fa-regular fa-lightbulb"></i> Bantuan';
    }
}

function undoPoint() {
    if (window.simpanTitik.length > 0) {
        window.simpanTitik.pop();
        if (window.myChart) {
            window.myChart.data.datasets[0].data.pop();
            window.myChart.update();
        }
        document.getElementById('graphFeedback').innerHTML = ''; 
    }
}

function clearAllPoints() {
    window.simpanTitik = [];
    if (window.myChart) {
        window.myChart.data.datasets[0].data = [];
        window.myChart.update();
    }
    document.getElementById('graphFeedback').innerHTML = ''; 
}

// Helper: Save Answer individual
async function saveAnswer(question, answer, isCorrect) {
    if (!supabaseClient) return;
    const studentName = document.getElementById('nama-siswa').value || 'Anonymous';
    await supabaseClient.from('student_answers').insert([{
        student_name: studentName,
        question: question,
        answer: answer,
        is_correct: isCorrect
    }]).select();
}

function savePresentation() {
    const link = document.getElementById('link_presentasi').value.trim();
    const feedback = document.getElementById('feedback_presentasi');
    if (link) {
        feedback.innerHTML = '<i class="fa-solid fa-check-circle"></i> Link siap dikirim!';
        feedback.className = 'feedback correct';
    } else {
        feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Masukkan link terlebih dahulu.';
        feedback.className = 'feedback wrong';
    }
}

// Logic Cek Jawaban (Catering: y = 17.5x)
async function checkAnswer(type) {
    let feedback, message; 
    let isCorrect = false;
    const KUNCI_M = 17.5;
    const VALID_ANSWERS = ["17.5x", "y=17.5x", "17.5x+0", "y=17.5x+0"];

    if (type === 'metode1') { 
        feedback = document.getElementById('feedback_metode1');
        let rawInput = document.getElementById('jawab_metode1').value.toLowerCase().trim();
        if (rawInput === '') {
            message = '<i class="fa-solid fa-circle-exclamation"></i> Isilah persamaan garis yang benar.';
            feedback.innerHTML = message; feedback.className = 'feedback wrong'; return;
        }
        let ans = rawInput.replace(/\s/g, '');
        if (VALID_ANSWERS.some(kunci => { const k = kunci.replace("y=",""); return ans === k || ans === "y="+k; })) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Rumus akhirnya adalah <strong>y = 17.5x </strong> (atau 17.5x).';
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Kurang tepat. Cek lagi operasi pada persamaannya!';
        }
    } 
    else if (type === 'metode2') { 
        feedback = document.getElementById('feedback_metode2');
        let gradInput = document.getElementById('jawab_gradien').value.trim();
        if (gradInput === '') {
            message = `<i class="fa-solid fa-circle-exclamation"></i> Hitung gradiennya terlebih dahulu.`;
            feedback.innerHTML = message; feedback.className = 'feedback wrong'; return;
        }
        let grad = parseFloat(gradInput.replace(',', '.'));
        let rawInput = document.getElementById('jawab_metode2').value.toLowerCase().replace(/\s/g, '');

        if (grad !== KUNCI_M) {
            message = `<i class="fa-solid fa-circle-exclamation"></i> Gradien salah. Hitung kembali gradiennya.`;
            feedback.innerHTML = message; feedback.className = 'feedback wrong'; return;
        }
        if (VALID_ANSWERS.some(kunci => { const k = kunci.replace("y=",""); return rawInput === k || rawInput === "y="+k; })) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Sempurna!</strong> Karyawan A menemukan harga nasi kotak per porsi adalah Rp17.500';
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Gradien benar, tapi persamaan akhirnya salah hitung.';
        }
    }
    else if (type === 'kesimpulan') {
        feedback = document.getElementById('feedback_kesimpulan');
        let ans = document.getElementById('jawab_kesimpulan').value;
        if (ans === 'Ya') {
            isCorrect = true;
            message = '<i class="fa-solid fa-thumbs-up"></i> Tepat! Matematika itu konsisten.';
            document.getElementById('reasonSection').classList.add('hidden');
            document.getElementById('finalEquationSection').classList.remove('hidden');
        } else if (ans === 'Tidak') {
            message = '<i class="fa-solid fa-circle-question"></i>';
            feedback.style.display = 'none';
            document.getElementById('reasonSection').classList.remove('hidden');
            document.getElementById('finalEquationSection').classList.add('hidden');
            return;
        } else {
            message = 'Pilih jawaban dulu.'; feedback.innerHTML = message; return;
        }
    }
    else if (type === 5) { 
        feedback = document.getElementById('feedback5');
        let ansRaw = document.getElementById('jawab5').value;
        let ans = parseFloat(ansRaw.replace(',', '.')); 
        if (Math.abs(ans - 1470) <= 0) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Biaya nasi kotak 84 porsi adalah Rp1.470.000.';
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i>  Salah. Substitusi nilai x = 84 pada persamaan final.';
        }
    }
    else if (type === 6) { 
        feedback = document.getElementById('feedback6');
        let ansString = document.getElementById('jawab6').value;
        let ans = parseFloat(ansString.replace(',', '.'));
        // 580.000 / 17.500 = 33.14... -> Maksimal 33 kotak
        if (!isNaN(ans) && Math.abs(ans - 33) <= 0) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Banyaknya maksimal nasi kotak yang dapat dibeli adalah 33 kotak.';
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Salah. Ingat, banyaknya nasi kotak tidak bisa dalam bentuk bilangan desimal.';
        }
    }
    feedback.innerHTML = message;
    feedback.className = isCorrect ? 'feedback correct' : 'feedback wrong';
    checkCompletion();
}

async function checkCoordAnswer(point) {
    const feedback = document.getElementById('coordFeedback');
    let correctX, correctY, inputX, inputY;
    if (point === 'A') { correctX = 20; correctY = 350; inputX = parseFloat(document.getElementById('coordAx').value); inputY = parseFloat(document.getElementById('coordAy').value); } 
    else if (point === 'B') { correctX = 40; correctY = 700; inputX = parseFloat(document.getElementById('coordBx').value); inputY = parseFloat(document.getElementById('coordBy').value); } 
    else return;

    if (isNaN(inputX) || isNaN(inputY)) {
        feedback.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Isilah nilai dari x dan y.`;
        feedback.className = 'feedback wrong';
    } else if (inputX === correctX && inputY === correctY) {
        feedback.innerHTML = `<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Koordinat ${point} adalah (${correctX}, ${correctY}).`;
        feedback.className = 'feedback correct';
        
        // [VALIDASI BARU] Simpan ke database
    } else {
        feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Salah. Cek lagi soal ceritanya.`;
        feedback.className = 'feedback wrong';
        
        // [VALIDASI BARU] Simpan ke database
    }
}

async function checkGraphPoints() {
    // Cek pakai variabel global yang lebih aman
    const points = window.simpanTitik;
    const feedback = document.getElementById('graphFeedback');
    
    // A(20, 350), B(40, 700)
    const hasA = points.some(p => Math.abs(p.x - 20) <= 0 && Math.abs(p.y - 350) <= 0);
    const hasB = points.some(p => Math.abs(p.x - 40) <= 0 && Math.abs(p.y - 700) <= 0);

 // KONDISI 1: SUDAH MENEMUKAN KEDUA TITIK (PAS)
    if (hasA && hasB) {
        feedback.innerHTML = `
            <i class="fa-solid fa-check-circle"></i> <strong>Luar Biasa!</strong><br>
            Kamu berhasil menemukan posisi titik A dan B dengan tepat.
        `;
        feedback.className = 'feedback correct'; // Warna Hijau
        
        // [VALIDASI BARU] Simpan ke database
    } 
    
    // KONDISI 2: BARU MENEMUKAN SATU TITIK (A SAJA)
    else if (hasA && !hasB) {
        feedback.innerHTML = `
            <i class="fa-solid fa-circle-exclamation"></i> <strong>Bagus! Titik A sudah pas.</strong><br>
            Tapi <strong>Titik B</strong> (40, 700) belum ketemu. Cari lagi ya!
        `;
        feedback.className = 'feedback wrong'; // Warna Merah (atau kuning jika diatur CSS)
        
        // [VALIDASI BARU] Simpan ke database
    } 
    
    // KONDISI 2: BARU MENEMUKAN SATU TITIK (B SAJA)
    else if (!hasA && hasB) {
        feedback.innerHTML = `
            <i class="fa-solid fa-circle-exclamation"></i> <strong>Bagus! Titik B sudah pas.</strong><br>
            Tapi <strong>Titik A</strong> (20, 350) belum ketemu. Cari lagi ya!
        `;
        feedback.className = 'feedback wrong';
        
        // [VALIDASI BARU] Simpan ke database
    } 
    
    // KONDISI 3: BELUM MENEMUKAN SAMA SEKALI
    else {
        // Cek apakah siswa sudah mencoba membuat titik atau belum
        if (points.length === 0) {
            feedback.innerHTML = `<i class="fa-solid fa-circle-info"></i> Klik pada area grafik untuk mulai mencari titik.`;
            feedback.className = 'feedback'; // Netral
        } else {
            feedback.innerHTML = `
                <i class="fa-solid fa-circle-xmark"></i> <strong>Belum Tepat.</strong><br>
                Posisi yang kamu tandai belum sesuai sasaran.<br>
            `;
            feedback.className = 'feedback wrong';
            
            // [VALIDASI BARU] Simpan ke database
        }
    }
}

function submitReason() {
    const reason = document.getElementById('reasonText').value.trim();
    const feedback = document.getElementById('reasonFeedback');
    if (reason === '') {
        feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Harap isi alasan.';
        feedback.className = 'feedback wrong';
    } else {
        feedback.innerHTML = '<i class="fa-solid fa-check-circle"></i> Alasan diterima. Terima kasih atas tanggapannya!';
        feedback.className = 'feedback correct';
    }
}

function checkFinalEquation() {
    const equation = document.getElementById('finalEquation').value.toLowerCase().replace(/\s/g, '').replace(/,/g, '.');
    const feedback = document.getElementById('finalFeedback');
    if (equation === '17.5x' || equation === 'y=17.5x' || equation === '17.5x+0' || equation === 'y=17.5x+0') {
        feedback.innerHTML = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Persamaan final telah dikonfirmasi.';
        feedback.className = 'feedback correct';
    } else {
        feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Persamaan belum tepat. Pastikan formatnya y = mx + c (bisa pakai titik atau koma).';
        feedback.className = 'feedback wrong';
    }
}

function checkDevAnswer(num) {
    const feedback = document.getElementById('devFeedback' + num);

    if (num === 1) {
        const rawAns = document.getElementById('devAnswer1').value.toLowerCase().trim();
        const validAnswers = ['gradien', 'kemiringan', 'gradient'];

        if (validAnswers.some(key => rawAns.includes(key)) || /\bm\b/.test(rawAns)) {
            feedback.innerHTML = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Itu adalah rumus <strong>Gradien (m)</strong>.';
            feedback.className = 'feedback correct';
        } else {
            feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Kurang tepat. Coba ingat kembali, rumus (y2-y1)/(x2-x1) itu rumus apa?';
            feedback.className = 'feedback wrong';
        }
    } else if (num === 2) {
        const ans = document.getElementById('devAnswer2').value.trim();
        if (ans.length > 15) {
            feedback.innerHTML = '<i class="fa-solid fa-check-circle"></i> <strong>Pendapat Diterima!</strong> Analisis yang bagus.';
            feedback.className = 'feedback correct';
        } else {
            feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Jawaban terlalu singkat.';
            feedback.className = 'feedback wrong';
        }
    }

    // Check completion after dev answers
    setTimeout(checkCompletion, 500);
}

function checkCompletion() {
    const ids = ['coordAx', 'jawab_metode1', 'jawab_gradien', 'jawab_metode2', 'jawab_kesimpulan', 'jawab5', 'jawab6', 'devAnswer1', 'devAnswer2'];
    const allFilled = ids.every(id => { const el = document.getElementById(id); return el && el.value.trim() !== ''; });
    
    // Cek juga chart
    if (allFilled && window.simpanTitik.length >= 2 && !localStorage.getItem('submitted')) {
        document.getElementById('confirmationModal').style.display = 'flex';
    }
}

function closeConfirmationModal() {
    document.getElementById('confirmationModal').style.display = 'none';
}

function saveLink() {
    const linkInput = document.getElementById('link_presentasi').value;
    const feedback = document.getElementById('feedback_presentasi');
    if (linkInput.includes('http') || linkInput.includes('www') || linkInput.includes('.com')) {
        feedback.innerHTML = '<i class="fa-solid fa-check-circle"></i> Link berhasil disimpan!';
        feedback.className = 'feedback correct';
    } else {
        feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Link tidak valid.';
        feedback.className = 'feedback wrong';
    }
}

function validateAndOpenModal() {
    let ids = [
        'nama-siswa', 'kelompok-siswa',
        'coordAx', 'coordAy', 'coordBx', 'coordBy',
        'jawab_metode1', 'jawab_gradien', 'jawab_metode2',
        'jawab_kesimpulan',
        'jawab5', 'jawab6',
        'devAnswer1', 'devAnswer2',
        'kesimpulan1', 'kesimpulan2'
    ];


    // Validasi bercabang berdasarkan jawaban refleksi
    const refleksiEl = document.getElementById('jawab_kesimpulan');
    const refleksiJawab = refleksiEl ? refleksiEl.value : '';
    if (refleksiJawab === 'Ya') {
        if (!ids.includes('finalEquation')) ids.push('finalEquation');
        ids = ids.filter(id => id !== 'reasonText');
    } else if (refleksiJawab === 'Tidak') {
        if (!ids.includes('reasonText')) ids.push('reasonText');
        ids = ids.filter(id => id !== 'finalEquation');
    } else {
        ids = ids.filter(id => id !== 'finalEquation' && id !== 'reasonText');
    }
    let emptyCount = 0;
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value.trim() === '') {
            el.style.borderColor = 'red'; 
            emptyCount++;
        } else if (el) {
            el.style.borderColor = '#ddd'; 
        }
    });

    if (emptyCount > 0) {
        alert(`Masih ada ${emptyCount} kolom jawaban yang belum diisi! Silakan lengkapi yang berwarna merah.`);
        const firstEmpty = ids.find(id => { const el = document.getElementById(id); return el && el.value.trim() === ''; });
        if(firstEmpty) document.getElementById(firstEmpty).scrollIntoView({behavior: "smooth", block: "center"});
    } else {
        document.getElementById('confirmationModal').style.display = 'flex';
    }
}

// =========================================
// 4. SUBMIT (SAFE MODE)
// =========================================
async function confirmSubmission() {
    const btn = document.querySelector('#confirmationModal .btn-check');
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }
    
    const sName = document.getElementById('nama-siswa').value || 'Tanpa Nama';
    let dataToSave = [];

    const isEq = (v) => { if(!v) return false; const c = v.toLowerCase().replace(/\s/g,'').replace(/,/g, '.'); return c === '17.5x' || c === 'y=17.5x' || c === '17.5x+0' || c === 'y=17.5x+0'; };
    const pushData = (q, ans, corr) => dataToSave.push({ student_name: sName, question: q, answer: ans, is_correct: corr });

    // === VALIDASI SOAL UTAMA ===
    pushData('Metode Karyawan B', document.getElementById('jawab_metode1').value, isEq(document.getElementById('jawab_metode1').value));
    pushData('Metode Karyawan A', document.getElementById('jawab_metode2').value, isEq(document.getElementById('jawab_metode2').value));
    
    let v5 = parseFloat(document.getElementById('jawab5').value.replace(',','.'));
    pushData('Biaya 84 Nasi Kotak', document.getElementById('jawab5').value, Math.abs(v5 - 1470) <= 0);
    let v6 = parseFloat(document.getElementById('jawab6').value.replace(',','.'));
    pushData('Maksimal Nasi Kotak', document.getElementById('jawab6').value, Math.abs(v6 - 33) <= 0);

    // === VALIDASI BARU: 8 PERTANYAAN TAMBAHAN ===
    
    // 1 & 2. Koordinat Titik A dan B
    const coordAx = parseFloat(document.getElementById('coordAx').value);
    const coordAy = parseFloat(document.getElementById('coordAy').value);
    const coordBx = parseFloat(document.getElementById('coordBx').value);
    const coordBy = parseFloat(document.getElementById('coordBy').value);
    
    pushData('Koordinat A', `(${coordAx}, ${coordAy})`, coordAx === 20 && coordAy === 350);
    pushData('Koordinat B', `(${coordBx}, ${coordBy})`, coordBx === 40 && coordBy === 700);
    
    // 3. Gradien (Metode 2)
    let gVal = parseFloat(document.getElementById('jawab_gradien').value.replace(',','.'));
    pushData('Gradien Karyawan A', document.getElementById('jawab_gradien').value, Math.abs(gVal - 17.5) < 0.1);
    
    // 4. Visualisasi Grafik Kartesius
    const points = window.simpanTitik || [];
    const hasA = points.some(p => Math.abs(p.x - 20) <= 0 && Math.abs(p.y - 350) <= 0);
    const hasB = points.some(p => Math.abs(p.x - 40) <= 0 && Math.abs(p.y - 700) <= 0);
    pushData('Visualisasi Grafik Kartesius', JSON.stringify(window.simpanTitik), hasA && hasB);
    
    // 5. Refleksi (Ya atau Tidak)
    const kesimpulan = document.getElementById('jawab_kesimpulan').value;
    pushData('Kesimpulan', kesimpulan, kesimpulan === 'Ya');
    if (kesimpulan === 'Ya') {
        pushData('Persamaan Final', document.getElementById('finalEquation').value, isEq(document.getElementById('finalEquation').value));
    } else if (kesimpulan === 'Tidak') {
        const alasanKesimpulan = document.getElementById('reasonText').value;
        pushData('Alasan Kesimpulan', alasanKesimpulan, false);
    }
    
    // 6. Persamaan Final
    
    // 7. Analisis Rumus (m, gradien, gradient, kemiringan = benar)
    const analisisRumus = document.getElementById('devAnswer1').value;
    pushData('Analisis Rumus', analisisRumus, 
    (['gradien','kemiringan','gradient'].some(k => analisisRumus.toLowerCase().trim().includes(k)) || /\bm\b/.test(analisisRumus.toLowerCase().trim())));
    
    // 8. Kapan Menggunakan Metode (>15 karakter = benar)
    const kapanMetode = document.getElementById('devAnswer2').value;
    pushData('Pendapat Kelompok', kapanMetode, kapanMetode.length > 15);

    // === FASE 2 (tidak divalidasi benar/salah) ===
    const pilihanStrategi = document.querySelector('input[name="pilih-strategi"]:checked');
    pushData('Pilihan Strategi', pilihanStrategi ? pilihanStrategi.value : '', !!(pilihanStrategi && pilihanStrategi.value.trim().length > 0));
    pushData('Alasan Strategi', document.getElementById('diskusi-alasan-strategi').value, document.getElementById('diskusi-alasan-strategi').value.trim().length > 0);
    pushData('Identifikasi Variabel', document.getElementById('diskusi-variabel').value, document.getElementById('diskusi-variabel').value.trim().length > 0);

    // === DATA INFO (TIDAK DIVALIDASI) ===
    pushData('Kesimpulan Konsep', document.getElementById('kesimpulan1').value, document.getElementById('kesimpulan1').value.trim().length >= 20);
    pushData('Kesimpulan Kontekstual', document.getElementById('kesimpulan2').value, document.getElementById('kesimpulan2').value.trim().length >= 20);
    pushData('Info Kelompok', '5', false);

    // [FIX LINK] Pastikan diambil saat submit
    const linkPres = document.getElementById('link_presentasi');
    if (linkPres && linkPres.value) pushData('Link Presentasi', linkPres.value, false);

    // 1. SIMPAN LOKAL DULU (PENTING! Agar Review Mode jalan 100%)
    localStorage.removeItem('dataReviewSiswa_Kel5');
    
    // Simpan nama siswa ke localStorage untuk review mode
    localStorage.setItem('nama-siswa', sName);
    
    // Simpan kelompok siswa ke localStorage untuk redirect ke halaman yang benar
    const kelompokSiswa = document.getElementById('kelompok-siswa').value || '5';
    localStorage.setItem('kelompok-siswa', kelompokSiswa);
    
    localStorage.setItem('dataReviewSiswa_Kel5', JSON.stringify(dataToSave));
    localStorage.setItem('submitted', 'true'); 

    // 2. KIRIM DATABASE (Try-Catch agar kalau internet mati, lokal tetap aman)
    try {
        if (supabaseClient) {
            // Hapus data lama dulu agar tidak dobel saat submit ulang
            await supabaseClient
                .from('student_answers')
                .delete()
                .eq('student_name', sName);

            const { error: insertError } = await supabaseClient.from('student_answers').insert(dataToSave);
            if (insertError) {
                alert('Gagal menyimpan jawaban ke database: ' + insertError.message + '\nSilakan hubungi guru.');
                if(btn) { btn.innerText = 'Simpan & Selesai'; btn.disabled = false; }
                return;
            }
        }
    } catch (e) {
        console.log("Database error/offline, tapi data lokal aman:", e);
    }

    // 3. PINDAH HALAMAN
    window.location.href = 'closing.html';
}

// =========================================
// 5. MODE KOREKSI GURU (GURU BISA LIHAT GRAFIK & LINK)
// =========================================

// =========================================
// FASE 5: KESIMPULAN
// =========================================
function checkKesimpulan(num) {
    const feedback = document.getElementById('feedbackKesimpulan' + num);
    const ans = document.getElementById('kesimpulan' + num).value.trim();
    if (ans.length < 20) {
        feedback.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Jawaban terlalu singkat. Jelaskan lebih lengkap!';
        feedback.className = 'feedback wrong';
    } else {
        feedback.innerHTML = '<i class="fa-solid fa-check-circle"></i> Jawaban telah disimpan. Terima kasih!';
        feedback.className = 'feedback correct';
    }
}

window.addEventListener('load', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const namaSiswa = urlParams.get('siswa');
    
    if (namaSiswa) {
        // Tampilkan banner mode koreksi segera
        const banner = document.createElement('div');
        banner.className = 'review-banner';
        banner.style.cssText = "position: fixed; top: 0; left: 0; right: 0; background: #ff9800; color: white; padding: 15px 20px; text-align: center; font-weight: bold; font-size: 16px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.2);";
        banner.innerHTML = `<i class="fa-solid fa-lock"></i> MODE KOREKSI: Jawaban <strong>${namaSiswa}</strong>`;
        document.body.prepend(banner);
        
        // Tambahkan padding ke header agar tanggal dan jam terlihat
        const header = document.querySelector('.main-header');
        if (header) {
            header.style.paddingTop = '80px';
        }
        
        // Disable buttons
        document.querySelectorAll('#btnFinalSubmit, .chart-controls button, .btn-check').forEach(el => el.style.display = 'none');
        
        // Load data from Supabase
        if (!supabaseClient) {
            banner.innerHTML += `<br><small style="color: #ffcccc;">Catatan: Database tidak tersedia.</small>`;
            return;
        }
        
        try {
            const { data, error } = await supabaseClient.from('student_answers').select('*').eq('student_name', namaSiswa);
            if (error || !data || data.length === 0) {
                console.warn('Data tidak ditemukan untuk siswa:', namaSiswa);
                banner.innerHTML += `<br><small style="color: #ffcccc;">Catatan: Data tidak ditemukan di database.</small>`;
                return;
            }
            const mapSoal = {
                'Metode Karyawan B': 'jawab_metode1', 'Gradien Karyawan A': 'jawab_gradien', 'Metode Karyawan A': 'jawab_metode2',
                'Kesimpulan': 'jawab_kesimpulan', 'Alasan Kesimpulan': 'reasonText', 'Persamaan Final': 'finalEquation',
                'Biaya 84 Nasi Kotak': 'jawab5', 'Maksimal Nasi Kotak': 'jawab6',
                'Info Kelompok': 'kelompok-siswa', 'Analisis Rumus': 'devAnswer1', 'Pendapat Kelompok': 'devAnswer2',
                'Link Presentasi': 'link_presentasi'
            };
            data.forEach(item => {
                // Grafik Guru
                if (item.question === 'Grafik Chart') {
                    try { 
                        const points = JSON.parse(item.answer);
                        // Guru mungkin belum load chart, jadi pakai ctx manual
                        const ctx = document.getElementById('myChart');
                        if (ctx && Chart.getChart(ctx)) {
                            const chart = Chart.getChart(ctx);
                            chart.data.datasets[0].data = points;
                            chart.update();
                        }
                    } catch(e) {}
                }
                
                let id = mapSoal[item.question];
                if (id) {
                    let el = document.getElementById(id);
                    if (el) {
                        el.value = item.answer;
                        if (item.is_correct !== null) el.style.backgroundColor = item.is_correct ? '#d4edda' : '#f8d7da';
                        if (item.question === 'Link Presentasi') {
                            const btnOpen = document.createElement('a');
                            btnOpen.href = item.answer; btnOpen.target = "_blank";
                            btnOpen.innerHTML = '<i class="fa-solid fa-external-link-alt"></i> Buka Link';
                            btnOpen.style.cssText = "display:block; margin-top:5px; padding:5px; background:#2196F3; color:white; text-align:center; border-radius:5px; text-decoration:none;";
                            el.parentNode.appendChild(btnOpen);
                        }
                    }
                }
                
                if (item.question === 'Koordinat A') {
                    const match = item.answer.match(/-?\d+/g);
                    if(match) { document.getElementById('coordAx').value = match[0]; document.getElementById('coordAy').value = match[1]; }
                }
                if (item.question === 'Koordinat B') {
                    const match = item.answer.match(/-?\d+/g);
                    if(match) { document.getElementById('coordBx').value = match[0]; document.getElementById('coordBy').value = match[1]; }
                }
            });
        } catch (e) {
            console.error('Error in teacher mode:', e);
            banner.innerHTML += `<br><small style="color: #ffcccc;">Catatan: Terjadi error: ${e.message}</small>`;
        }
        document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        document.getElementById('nama-siswa').value = namaSiswa;
    }
});

// =========================================
// FITUR TAMPILAN BENAR/SALAH MODE REVIEW
// =========================================

function tampilkanStatusJawaban(data) {
    const urlParams = new URLSearchParams(window.location.search);
    const isReviewMode = urlParams.get('mode') === 'review';
    const isGuruMode = urlParams.get('siswa');
    if (!isReviewMode && !isGuruMode) return;

    const soalDiabaikan = ['Info Kelompok', 'nama-siswa', 'Link Presentasi', 'Alasan Kesimpulan', 'KOMENTAR_KEL_1', 'KOMENTAR_KEL_2', 'KOMENTAR_KEL_3', 'KOMENTAR_KEL_4', 'KOMENTAR_KEL_5'];
    const soalData = data.filter(item =>
        !soalDiabaikan.includes(item.question) &&
        item.is_correct !== null &&
        item.is_correct !== undefined
    );

    const totalSoal = soalData.length;
    const totalBenar = soalData.filter(item => item.is_correct === true).length;

    // --- Ikon ✅/❌ di setiap input field ---
    if (isGuruMode) {
    setTimeout(() => {
        document.querySelectorAll('input, select, textarea').forEach(el => {
            if (el.disabled && el.style.backgroundColor &&
                (el.style.backgroundColor === 'rgb(212, 237, 218)' ||
                 el.style.backgroundColor === 'rgb(248, 215, 218)')) {

                if (el.parentElement.querySelector('.review-status-icon')) return;
                if (el.type === 'hidden') return;

                const isBenar = el.style.backgroundColor === 'rgb(212, 237, 218)';
                const icon = document.createElement('span');
                icon.className = 'review-status-icon ' + (isBenar ? 'benar' : 'salah');
                icon.innerHTML = isBenar
                    ? '<i class="fa-solid fa-circle-check"></i>'
                    : '<i class="fa-solid fa-circle-xmark"></i>';
                el.insertAdjacentElement('afterend', icon);
            }
        });

        // Ikon grafik kartesius
        const grafik = data.find(item =>
            item.question === 'Visualisasi Grafik Kartesius' || item.question === 'Grafik Chart'
        );
        if (grafik) {
            const grafikFeedback = document.getElementById('graphFeedback');
            if (grafikFeedback && !grafikFeedback.querySelector('.review-status-icon')) {
                grafikFeedback.innerHTML = grafik.is_correct
                    ? '<i class="fa-solid fa-circle-check"></i> <strong>Grafik Benar!</strong> Titik A dan B terpasang dengan tepat.'
                    : '<i class="fa-solid fa-circle-xmark"></i> <strong>Grafik Belum Tepat.</strong> Titik yang diplot belum sesuai.';
                grafikFeedback.className = grafik.is_correct ? 'feedback correct' : 'feedback wrong';
            }
        }

        // Ikon koordinat A & B
        const koordinatA = data.find(item => item.question === 'Koordinat A' || item.question === 'Koordinat Titik A');
        const koordinatB = data.find(item => item.question === 'Koordinat B' || item.question === 'Koordinat Titik B');
        const coordFeedback = document.getElementById('coordFeedback');
        if (coordFeedback && (koordinatA || koordinatB)) {
            const aBenar = koordinatA ? koordinatA.is_correct : false;
            const bBenar = koordinatB ? koordinatB.is_correct : false;
            const ikonA = aBenar ? '✅' : '❌';
            const ikonB = bBenar ? '✅' : '❌';
            coordFeedback.innerHTML = `${ikonA} Titik A: <strong>${aBenar ? 'Benar' : 'Salah'}</strong> &nbsp;|&nbsp; ${ikonB} Titik B: <strong>${bBenar ? 'Benar' : 'Salah'}</strong>`;
            coordFeedback.className = (aBenar && bBenar) ? 'feedback correct' : 'feedback wrong';
        }
    }, 300);
    }

     // --- Panel Ringkasan Skor (HANYA MODE GURU) ---
    if (isGuruMode) {
        // --- Panel Ringkasan Skor ---
        const persen = totalSoal > 0 ? Math.round((totalBenar / totalSoal) * 100) : 0;
        let warnaPanel, emoji, predikat;
        if (persen >= 80) { warnaPanel = '#28a745'; emoji = '🏆'; predikat = 'Sangat Baik'; }
        else if (persen >= 60) { warnaPanel = '#fd7e14'; emoji = '📝'; predikat = 'Cukup Baik'; }
        else { warnaPanel = '#dc3545'; emoji = '📌'; predikat = 'Perlu Perhatian'; }

        // Buat detail item per soal (pakai class CSS)
        let detailHTML = '<div class="review-detail-label">Detail Per Soal</div>';
        soalData.forEach(item => {
            const status = item.is_correct ? 'benar' : 'salah';
            const ikonClass = item.is_correct ? 'fa-circle-check' : 'fa-circle-xmark';
            const jawaban = item.answer
                ? (item.answer.length > 60 ? item.answer.substring(0, 60) + '...' : item.answer)
                : '(kosong)';
            detailHTML += `
                <div class="review-detail-item ${status}">
                    <div class="review-detail-icon ${status}">
                        <i class="fa-solid ${ikonClass}"></i>
                    </div>
                    <div class="review-detail-text">
                        <div class="review-detail-question">${item.question}</div>
                        <div class="review-detail-answer">${jawaban}</div>
                    </div>
                </div>`;
        });

        // Bangun panel (style inline HANYA untuk nilai dinamis: warna & persentase)
        const panel = document.createElement('div');
        panel.id = 'review-score-panel';
        panel.style.borderTop = `5px solid ${warnaPanel}`;
        panel.innerHTML = `
            <div class="review-panel-header">
                <div class="review-panel-title-row">
                    <h4>${emoji} Hasil Jawaban Siswa</h4>
                    <button class="btn-toggle-panel" id="btnTogglePanel" onclick="toggleReviewPanel()">Ciutkan</button>
                </div>
                <div class="review-score-row">
                    <div class="review-score-ring" style="background: conic-gradient(${warnaPanel} ${persen * 3.6}deg, #eee 0deg);">
                        <div class="review-score-ring-inner" style="color: ${warnaPanel};">${persen}%</div>
                    </div>
                    <div>
                        <div class="review-score-number" style="color: ${warnaPanel};">${totalBenar} / ${totalSoal}</div>
                        <div class="review-score-label">Jawaban Benar</div>
                        <div class="review-score-badge" style="background: ${warnaPanel}22; color: ${warnaPanel};">${predikat}</div>
                    </div>
                </div>
            </div>
            <div id="review-detail-list">${detailHTML}</div>
        `;

        document.body.appendChild(panel);
        document.body.classList.add('review-panel-open');
    }
}
function toggleReviewPanel() {
    const detail = document.getElementById('review-detail-list');
    const btn = document.getElementById('btnTogglePanel');
    const panel = document.getElementById('review-score-panel');
    if (!detail) return;

    if (detail.style.display === 'none') {
        detail.style.display = '';
        btn.textContent = 'Ciutkan';
        panel.style.maxHeight = 'calc(100vh - 80px)';
    } else {
        detail.style.display = 'none';
        btn.textContent = 'Perluas';
        panel.style.maxHeight = '';
    }
}