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

// [PENTING] Variabel Global untuk menyimpan data titik (Sama seperti Kel 5)
window.simpanTitik = [];

// =========================================
// 2. MAIN LOGIC (CHART & REVIEW MODE)
// =========================================

document.addEventListener('DOMContentLoaded', function() {
    
    // 1. TAMPILAN KELOMPOK
    const elSelect = document.getElementById('kelompok-siswa');
    const savedKel = localStorage.getItem('kelompok-siswa');
    if (elSelect && savedKel) {
        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<strong>Kelompok ${savedKel}</strong>`;
        textSpan.style.textAlign = 'left'; textSpan.style.width = '100%'; textSpan.style.color = '#333'; textSpan.style.padding = '5px 0'; textSpan.style.flexGrow = '1';
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden'; hiddenInput.id = 'kelompok-siswa'; hiddenInput.value = savedKel;
        elSelect.parentNode.replaceChild(textSpan, elSelect);
        textSpan.parentNode.appendChild(hiddenInput);
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
                    label: 'Pertumbuhan Tanaman',
                    data: [], 
                    backgroundColor: '#A18B83',
                    borderColor: '#A18B83',
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

                    const activeChart = Chart.getChart('myChart');
                    if (!activeChart) return;

                    const elements = activeChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                    if (elements.length > 0) return;

                    const canvasPosition = Chart.helpers.getRelativePosition(e, activeChart);
                    const xVal = Math.round(activeChart.scales.x.getValueForPixel(canvasPosition.x));
                    const yVal = Math.round(activeChart.scales.y.getValueForPixel(canvasPosition.y));
                    
                    // Simpan ke Variabel Global (Teknik Kelompok 5)
                    window.simpanTitik.push({ x: xVal, y: yVal });
                    
                    const label = String.fromCharCode(65 + activeChart.data.datasets[0].data.length);
                    activeChart.data.datasets[0].data.push({ x: xVal, y: yVal, label: label });
                    activeChart.update();
                    
                    const feedback = document.getElementById('graphFeedback');
                    if(feedback) feedback.innerHTML = ''; 
                },
                scales: {
                    x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Waktu (Hari)', font: {weight:'bold'} }, min: 0, max: 30, ticks: { stepSize: 2 } },
                    y: { title: { display: true, text: 'Tinggi tanaman (cm)', font: {weight:'bold'} }, min: 0, max: 50, ticks: { stepSize: 5 } }
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
        
        setupOnlineComments(); 
        showReviewBanner();
        
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
                const rawData = localStorage.getItem('dataReviewSiswa_Kel4');
                
                if (rawData) {
                    try {
                        const data = JSON.parse(rawData);
                        console.log('[SISWA MODE] Data ditemukan di localStorage:', data.length, 'items');
                        
                        // Validasi kelompok
                        const kelompokData = data.find(item => item.question === 'Info Kelompok');
                        if (kelompokData && kelompokData.answer === '4') {
                            dataToLoad = data;
                            console.log('[SISWA MODE] ✅ Data localStorage valid untuk Kelompok 4');
                        } else {
                            console.warn('[SISWA MODE] ⚠️ Data localStorage bukan untuk Kelompok 4');
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
                                if (kelompokData && kelompokData.answer === '4') {
                                    dataToLoad = data;
                                    console.log('[SISWA MODE] ✅ Data Supabase valid:', data.length, 'items');
                                } else {
                                    console.warn('[SISWA MODE] ⚠️ Data Supabase bukan untuk Kelompok 4');
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
            }
        }, 500);
    }
});


// =========================================
// 3. FITUR KOMENTAR ONLINE (SUPABASE)
// =========================================

function setupOnlineComments() {
    const section = document.createElement('div');
    section.id = 'comment-section';
    section.style.cssText = "width: 90%; max-width: 800px; margin: 30px auto 100px; background: #fff; padding: 25px; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-top: 5px solid #11998e;";
    section.innerHTML = `
        <h3 style="margin-top:0; color:#11998e;"><i class="fa-solid fa-comments"></i> Tanggapan Teman & Guru</h3>
        <p style="font-size:0.9rem; color:#666;">Feedback ini tersimpan online dan bisa dilihat oleh kelompok presentasi.</p>
        
        <div id="comments-list" style="max-height:300px; overflow-y:auto; margin-bottom:20px; padding-right:10px; border-bottom:1px solid #eee;">
            <p style="text-align:center; color:#ccc;">Belum ada tanggapan.</p>
        </div>

        <div style="background:#f5f5f5; padding:15px; border-radius:10px;">
            <input type="text" id="commentName" placeholder="Nama Kamu / Kelompok" style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:5px;">
            <textarea id="commentText" rows="3" placeholder="Tulis tanggapan..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:5px; resize:vertical;"></textarea>
            <button id="btnSaveComment" onclick="sendCommentToSupabase()" style="margin-top:10px; background:#11998e; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold; width:100%;">
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
    
    // Gunakan flag khusus 'KOMENTAR_KEL_4'
    if (supabaseClient) {
        console.log('[KOMENTAR] Supabase client tersedia, mengirim...');
        
        const { data, error } = await supabaseClient.from('student_answers').insert([{
            student_name: name, 
            question: 'KOMENTAR_KEL_4', 
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
                let myComments = JSON.parse(localStorage.getItem('myComments_Kel4') || '[]');
                myComments.push(commentId);
                localStorage.setItem('myComments_Kel4', JSON.stringify(myComments));
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
        .eq('question', 'KOMENTAR_KEL_4')
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
        const myComments = JSON.parse(localStorage.getItem('myComments_Kel4') || '[]');

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
                    <div style="font-weight:bold; color:#11998e; display:flex; justify-content:space-between; align-items:center;">
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
        let myComments = JSON.parse(localStorage.getItem('myComments_Kel4') || '[]');
        myComments = myComments.filter(id => id !== commentId);
        localStorage.setItem('myComments_Kel4', JSON.stringify(myComments));
        
        // Reload komentar
        loadCommentsFromSupabase();
        alert('Komentar berhasil dihapus!');
    }
}

// =========================================
// 4. FUNGSI LOGIKA (GLOBAL SCOPE)
// =========================================

// --- [FIX] MEMUNCULKAN KEMBALI JAM & TANGGAL ---
const now = new Date();
if(document.getElementById('tanggal')) {
    document.getElementById('tanggal').textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function updateTime() { 
    if(document.getElementById('waktu')) {
        document.getElementById('waktu').textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); 
    }
}
updateTime(); 
setInterval(updateTime, 1000);
// ---------------------------------------------------------

function isiFormulirOtomatis(data) {
    const dataSiswa = data.find(item => item.student_name && item.student_name !== 'Tanpa Nama');
    if (dataSiswa) document.getElementById('nama-siswa').value = dataSiswa.student_name;

    const mapSoal = {
        'Metode Edo': 'jawab_metode1',
        'Gradien Siti': 'jawab_gradien',
        'Metode Siti': 'jawab_metode2',
        'Kesimpulan': 'jawab_kesimpulan',
        'Alasan Kesimpulan': 'reasonText',
        'Persamaan Final': 'finalEquation',
        'Menanam 2 Minggu': 'jawab5',
        'Waktu Tanaman Mencapai Tinggi': 'jawab6',
        'Info Kelompok': 'kelompok-siswa',
        'Analisis Rumus': 'devAnswer1',
        'Pendapat Kelompok': 'devAnswer2',
        'Link Presentasi': 'link_presentasi'
    };

    data.forEach(item => {
        // Restore Grafik dari window.simpanTitik jika ada
        if (item.question === 'Visualisasi Grafik Kartesius') {
            try { 
                const points = JSON.parse(item.answer);
                window.simpanTitik = points; // Restore ke global
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
                
                if (item.question === 'Link Presentasi') {
                    const btnOpen = document.createElement('a');
                    btnOpen.href = item.answer; btnOpen.target = "_blank";
                    btnOpen.innerHTML = '<i class="fa-solid fa-external-link-alt"></i> Buka Link';
                    btnOpen.style.cssText = "display:block; margin-top:5px; padding:5px; background:#2196F3; color:white; text-align:center; border-radius:5px; text-decoration:none;";
                    el.parentNode.appendChild(btnOpen);
                }
            }
        }
        
        if (item.question === 'Koordinat A') { const match = item.answer.match(/-?\d+/g); if(match) { document.getElementById('coordAx').value = match[0]; document.getElementById('coordAy').value = match[1]; } }
        if (item.question === 'Koordinat B') { const match = item.answer.match(/-?\d+/g); if(match) { document.getElementById('coordBx').value = match[0]; document.getElementById('coordBy').value = match[1]; } }
    });
}

// --- Fungsi Show Review Banner ---
function showReviewBanner() {
    const banner = document.createElement('div');
    banner.className = 'review-banner';
    // Style Inline agar pasti muncul
    banner.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; background: #FFEB3B; color: #333; text-align: center; padding: 15px; font-weight: bold; font-size: 16px; z-index: 10000; box-shadow: 0 2px 5px rgba(0,0,0,0.2);";
    banner.innerHTML = '<i class="fa-solid fa-eye"></i> MODE REVIEW: Jawaban Anda telah tersimpan.';
    document.body.prepend(banner);
    document.body.style.marginTop = '60px';
}

function disableInputs() {
    document.querySelectorAll('input, select, textarea, button').forEach(el => {
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

// Logic Cek Jawaban (Catering: y = 2.5x-3)
async function checkAnswer(type) {
    let feedback, message; 
    let isCorrect = false;
    const KUNCI_M = 2.5;
    const VALID_ANSWERS = ["2.5x-3", "y=2.5x-3", "2,5x-3", "y=2,5x-3"];

    if (type === 'metode1') { 
        feedback = document.getElementById('feedback_metode1');
        let rawInput = document.getElementById('jawab_metode1').value.toLowerCase().trim();
        if (rawInput === '') {
            message = '<i class="fa-solid fa-circle-exclamation"></i> Isilah persamaan garis yang benar.';
            feedback.innerHTML = message; feedback.className = 'feedback wrong'; return;
        }
        let ans = rawInput.replace(/\s/g, '');
        if (VALID_ANSWERS.some(kunci => ans.includes(kunci.replace("y=", "")))) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Rumus akhirnya adalah <strong>y = 2.5x - 3 </strong> (atau 2,5x - 3).';
            await saveAnswer('Metode Karyawan B', rawInput, true);
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Kurang tepat. Cek lagi operasi pada persamaannya!';
            await saveAnswer('Metode Karyawan B', rawInput, false);
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
        if (VALID_ANSWERS.some(kunci => rawInput.includes(kunci.replace("y=", "")))) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Sempurna!</strong> Siti menemukan laju pertumbuhan tanaman kacang hijau adalah 2.5 cm/hari.';
            await saveAnswer('Metode Karyawan A', document.getElementById('jawab_metode2').value, true);
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Gradien benar, tapi persamaan akhirnya salah hitung.';
            await saveAnswer('Metode Karyawan A', document.getElementById('jawab_metode2').value, false);
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
        if (Math.abs(ans - 32) <= 0) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Tinggi tanaman kacang hijau setelah ditanam 2 minggu adalah 32 cm';
            await saveAnswer('Menanam 2 Minggu', ansRaw, true);
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Salah. Substitusi nilai x = 14 pada persamaan final.';
            await saveAnswer('Menanam 2 Minggu', ansRaw, false);
        }
    }
    // --- UJI COBA 2 (Tinggi 50 cm) ---
    else if (type === 6) { 
        feedback = document.getElementById('feedback6');
        let ansString = document.getElementById('jawab6').value; // Ambil teks asli
        let ans = parseFloat(ansString.replace(',', '.'));      // Ubah ke angka

        // Hitungan: 47 = 2.5x - 3  ->  2.5x = 50  ->  x = 50 / 2.5 = 20
        if (!isNaN(ans) && Math.abs(ans - 20) <= 0) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Waktu yang dibutuhkan agar tanaman mencapai tinggi 47 cm adalah 20 hari.';
            await saveAnswer('Waktu Tanaman Mencapai Tinggi', ansString, true);
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Salah. Substitusi nilai y = 47 pada persamaan finalmu.';
            await saveAnswer('Waktu Tanaman Mencapai Tinggi', ansString, false);
        }
    }
    feedback.innerHTML = message;
    feedback.className = isCorrect ? 'feedback correct' : 'feedback wrong';
    checkCompletion();
}

async function checkCoordAnswer(point) {
    const feedback = document.getElementById('coordFeedback');
    let correctX, correctY, inputX, inputY;
    if (point === 'A') { correctX = 4; correctY = 7; inputX = parseFloat(document.getElementById('coordAx').value); inputY = parseFloat(document.getElementById('coordAy').value); } 
    else if (point === 'B') { correctX = 10; correctY = 22; inputX = parseFloat(document.getElementById('coordBx').value); inputY = parseFloat(document.getElementById('coordBy').value); } 
    else return;

    if (isNaN(inputX) || isNaN(inputY)) {
        feedback.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Isilah nilai dari x dan y.`;
        feedback.className = 'feedback wrong';
    } else if (inputX === correctX && inputY === correctY) {
        feedback.innerHTML = `<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Koordinat ${point} adalah (${correctX}, ${correctY}).`;
        feedback.className = 'feedback correct';
        
        // [VALIDASI BARU] Simpan ke database
        await saveAnswer(`Koordinat Titik ${point}`, `(${inputX}, ${inputY})`, true);
    } else {
        feedback.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Salah. Cek lagi soal ceritanya.`;
        feedback.className = 'feedback wrong';
        
        // [VALIDASI BARU] Simpan ke database
        await saveAnswer(`Koordinat Titik ${point}`, `(${inputX}, ${inputY})`, false);
    }
}

async function checkGraphPoints() {
    // Cek pakai variabel global yang lebih aman
    const points = window.simpanTitik;
    const feedback = document.getElementById('graphFeedback');
    
    // A(4, 7), B(10, 22)
    const hasA = points.some(p => Math.abs(p.x - 4) <= 0 && Math.abs(p.y - 7) <= 0);
    const hasB = points.some(p => Math.abs(p.x - 10) <= 0 && Math.abs(p.y - 22) <= 0);

 // KONDISI 1: SUDAH MENEMUKAN KEDUA TITIK (PAS)
    if (hasA && hasB) {
        feedback.innerHTML = `
            <i class="fa-solid fa-check-circle"></i> <strong>Luar Biasa!</strong><br>
            Kamu berhasil menemukan posisi titik A dan B dengan tepat.
        `;
        feedback.className = 'feedback correct'; // Warna Hijau
        
        // [VALIDASI BARU] Simpan ke database
        await saveAnswer('Visualisasi Grafik Kartesius', 'Kedua titik benar', true);
    } 
    
    // KONDISI 2: BARU MENEMUKAN SATU TITIK (A SAJA)
    else if (hasA && !hasB) {
        feedback.innerHTML = `
            <i class="fa-solid fa-circle-exclamation"></i> <strong>Bagus! Titik A sudah pas.</strong><br>
            Tapi <strong>Titik B</strong> (10, 22) belum ketemu. Cari lagi ya!
        `;
        feedback.className = 'feedback wrong'; // Warna Merah (atau kuning jika diatur CSS)
        
        // [VALIDASI BARU] Simpan ke database
        await saveAnswer('Visualisasi Grafik Kartesius', 'Hanya titik A benar', false);
    } 
    
    // KONDISI 2: BARU MENEMUKAN SATU TITIK (B SAJA)
    else if (!hasA && hasB) {
        feedback.innerHTML = `
            <i class="fa-solid fa-circle-exclamation"></i> <strong>Bagus! Titik B sudah pas.</strong><br>
            Tapi <strong>Titik A</strong> (4, 7) belum ketemu. Cari lagi ya!
        `;
        feedback.className = 'feedback wrong';
        
        // [VALIDASI BARU] Simpan ke database
        await saveAnswer('Visualisasi Grafik Kartesius', 'Hanya titik B benar', false);
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
            await saveAnswer('Visualisasi Grafik Kartesius', 'Kedua titik salah', false);
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
    const equation = document.getElementById('finalEquation').value.toLowerCase().replace(/\s/g, '');
    const feedback = document.getElementById('finalFeedback');
    if (equation.includes('2.5x-3') || equation.includes('2,5x-3')) {
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
        const validAnswers = ['gradien', 'kemiringan', 'm', 'gradient'];

        if (validAnswers.some(key => rawAns.includes(key))) {
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
    const ids = ['coordAx', 'jawab_metode1', 'jawab_gradien', 'jawab_metode2', 'jawab_kesimpulan', 'finalEquation', 'jawab5', 'jawab6', 'devAnswer1', 'devAnswer2'];
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



// =========================================
// 5. SUBMIT & VALIDASI (GLOBAL)
// =========================================

function validateAndOpenModal() {
    const ids = ['nama-siswa', 'kelompok-siswa', 'coordAx', 'coordAy', 'coordBx', 'coordBy', 'jawab_metode1', 'jawab_gradien', 'jawab_metode2', 'jawab_kesimpulan', 'finalEquation', 'jawab5', 'jawab6', 'devAnswer1', 'devAnswer2'];
    let emptyCount = 0;
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value.trim() === '') { el.style.borderColor = 'red'; emptyCount++; }
        else if (el) { el.style.borderColor = '#ddd'; }
    });
    if (emptyCount > 0) {
        alert(`Lengkapi ${emptyCount} kotak berwarna merah!`);
        const firstEmpty = ids.find(id => document.getElementById(id).value.trim() === '');
        if(firstEmpty) document.getElementById(firstEmpty).scrollIntoView({behavior: "smooth", block: "center"});
    } else {
        document.getElementById('confirmationModal').style.display = 'flex';
    }
}

async function confirmSubmission() {
    const btn = document.querySelector('#confirmationModal .btn-check');
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    const sName = document.getElementById('nama-siswa').value || 'Tanpa Nama';
    let dataToSave = [];

    const isEq = (v) => {
        if(!v) return false;
        const clean = v.toLowerCase().replace(/\s/g,'').replace(/,/g, '.');
        return clean.includes('2.5x') && clean.includes('-3');
    };
    const pushData = (q, ans, corr) => dataToSave.push({ student_name: sName, question: q, answer: ans, is_correct: corr });

    // === VALIDASI SOAL UTAMA ===
    const m1 = document.getElementById('jawab_metode1');
    if(m1) pushData('Metode Edo', m1.value, isEq(m1.value));

    const m2 = document.getElementById('jawab_metode2');
    if(m2) pushData('Metode Siti', m2.value, isEq(m2.value));

    const j5 = document.getElementById('jawab5');
    if(j5) {
        let val5 = parseFloat(j5.value.replace(',', '.'));
        pushData('Menanam 2 Minggu', j5.value, Math.abs(val5 - 32) < 1);
    }

    const j6 = document.getElementById('jawab6'); 
    if(j6) {
        let val6 = parseFloat(j6.value.replace(',', '.'));
        pushData('Waktu Tanaman Mencapai Tinggi', j6.value, Math.abs(val6 - 20) < 1);
    }

    // === VALIDASI BARU: 8 PERTANYAAN TAMBAHAN ===
    
    // 1 & 2. Koordinat Titik A dan B
    const coordAx = parseFloat(document.getElementById('coordAx').value);
    const coordAy = parseFloat(document.getElementById('coordAy').value);
    const coordBx = parseFloat(document.getElementById('coordBx').value);
    const coordBy = parseFloat(document.getElementById('coordBy').value);
    
    pushData('Koordinat A', `(${coordAx}, ${coordAy})`, coordAx === 4 && coordAy === 7);
    pushData('Koordinat B', `(${coordBx}, ${coordBy})`, coordBx === 10 && coordBy === 22);
    
    // 3. Gradien (Metode 2)
    const grad = document.getElementById('jawab_gradien');
    if(grad) {
        const val = parseFloat(grad.value.replace(',', '.'));
        pushData('Gradien Siti', grad.value, Math.abs(val - 2.5) < 0.01);
    }
    
    // 4. Visualisasi Grafik Kartesius
    const points = window.simpanTitik || [];
    const hasA = points.some(p => Math.abs(p.x - 4) <= 0 && Math.abs(p.y - 7) <= 0);
    const hasB = points.some(p => Math.abs(p.x - 10) <= 0 && Math.abs(p.y - 22) <= 0);
    pushData('Visualisasi Grafik Kartesius', JSON.stringify(window.simpanTitik), true);
    pushData('Visualisasi Grafik Kartesius', `${points.length} titik`, hasA && hasB);
    
    // 5. Refleksi (Ya atau Tidak)
    const kes = document.getElementById('jawab_kesimpulan');
    if(kes) pushData('Kesimpulan', kes.value, kes.value === 'Ya' || kes.value === 'Tidak');
    
    // 6. Persamaan Final
    const final = document.getElementById('finalEquation');
    if(final) pushData('Persamaan Final', final.value, isEq(final.value));
    
    // 7. Analisis Rumus (>15 karakter = benar)
    const dev1 = document.getElementById('devAnswer1');
    if(dev1) pushData('Analisis Rumus', dev1.value, dev1.value.length > 15);
    
    // 8. Kapan Menggunakan Metode (>15 karakter = benar)
    const dev2 = document.getElementById('devAnswer2');
    if(dev2) pushData('Pendapat Kelompok', dev2.value, dev2.value.length > 15);

    // === DATA INFO (TIDAK DIVALIDASI) ===
    const kel = document.getElementById('kelompok-siswa');
    if(kel) pushData('Info Kelompok', kel.value, null);

    // Link
    const linkPres = document.getElementById('link_presentasi');
    if (linkPres && linkPres.value) pushData('Link Presentasi', linkPres.value, null);

    // KIRIM KE SUPABASE
    if (supabaseClient) await supabaseClient.from('student_answers').insert(dataToSave);
    
    // Simpan Lokal
    localStorage.removeItem('dataReviewSiswa');
    
    // Simpan nama siswa ke localStorage untuk review mode
    localStorage.setItem('nama-siswa', sName);
    
    // Simpan kelompok siswa ke localStorage untuk redirect ke halaman yang benar
    const kelompokSiswa = document.getElementById('kelompok-siswa').value || '4';
    localStorage.setItem('kelompok-siswa', kelompokSiswa);
    
    localStorage.setItem('dataReviewSiswa_Kel4', JSON.stringify(dataToSave));
    localStorage.setItem('submitted', 'true'); 
    
    window.location.href = 'closing.html';
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

// =========================================
// 6. MODE GURU (UPDATED)
// =========================================
window.addEventListener('load', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const namaSiswa = urlParams.get('siswa');
    
    if (namaSiswa) {
        // Tampilkan banner mode koreksi segera
        const banner = document.createElement('div');
        banner.className = 'review-banner';
        banner.innerHTML = `<i class="fa-solid fa-lock"></i> MODE KOREKSI: Jawaban <strong>${namaSiswa}</strong>`;
        document.body.prepend(banner);
        document.body.style.marginTop = '60px';
        
        // Disable buttons
        document.querySelectorAll('#btnFinalSubmit, .chart-controls button, .btn-check').forEach(el => el.style.display = 'none');
        
        disableInputs();
        
        // Load data from Supabase
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient.from('student_answers').select('*').eq('student_name', namaSiswa);
                if (!error && data && data.length > 0) {
                    isiFormulirOtomatis(data);
                } else {
                    console.warn('Data tidak ditemukan untuk siswa:', namaSiswa);
                    banner.innerHTML += `<br><small style="color: #ffcccc;">Catatan: Data tidak ditemukan di database.</small>`;
                }
            } catch (err) {
                console.error('Error loading student data:', err);
                banner.innerHTML += `<br><small style="color: #ffcccc;">Catatan: Gagal memuat data dari database.</small>`;
            }
        }
    }
});