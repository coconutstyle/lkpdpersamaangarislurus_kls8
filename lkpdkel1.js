// =========================================
// 1. SETUP & UTILITY
// =========================================

// Supabase setup
const supabaseUrl = 'https://cydgsvqybhhfedoazfok.supabase.co'; // Ganti dengan Project URL Anda
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGdzdnF5YmhoZmVkb2F6Zm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDc5ODAsImV4cCI6MjA4MzQyMzk4MH0.4p4It2z4qVyLNydXwNdOHx9es7R5zAbB-EevFZVk5Y8'; // Ganti dengan kunci anon Anda
let supabaseClient;
try {
    supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
} catch (error) {
    console.error('Error initializing Supabase:', error);
    supabaseClient = null;
}

// [PENTING] Variabel Global untuk menyimpan data titik (Sama seperti Kel 5)
window.simpanTitik = [];
window.myChart = null;

// Fungsi untuk menyimpan jawaban
async function saveAnswer(question, answer, isCorrect) {
    if (!supabaseClient) {
        console.warn('Supabase not initialized, skipping save.');
        return;
    }
    const studentName = document.getElementById('nama-siswa').value || 'Anonymous';
    const { error } = await supabaseClient.from('student_answers').insert([{
        student_name: studentName,
        question: question,
        answer: answer,
        is_correct: isCorrect
    }]);
    if (error) console.error('Error menyimpan jawaban:', error);
}

// Set tanggal otomatis (akan dipanggil di DOMContentLoaded)
function initDateTime() {
    const now = new Date();
    const tanggalEl = document.getElementById('tanggal');
    if (tanggalEl) {
        tanggalEl.textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
}

// Update waktu setiap detik
function updateTime() {
    const waktuEl = document.getElementById('waktu');
    if (waktuEl) {
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        waktuEl.textContent = timeStr;
    }
}
updateTime();
setInterval(updateTime, 1000);

// Fungsi untuk menyimpan input ke localStorage
function saveInputValue(id) {
    const element = document.getElementById(id);
    if (element) {
        localStorage.setItem(id, element.value);
    }
}

// Fungsi untuk memuat input dari localStorage
function loadInputValue(id) {
    const value = localStorage.getItem(id);
    const element = document.getElementById(id);
    if (element && value !== null) {
        element.value = value;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 1. DAFTAR ID YANG HARUS DISIMPAN OTOMATIS
    const inputIds = [
        'kelompok-siswa', 'nama-siswa',
        'coordAx', 'coordAy', 'coordBx', 'coordBy',
        'jawab_metode1', 'jawab_gradien', 'jawab_metode2',
        'jawab_kesimpulan', 'finalEquation', 'reasonText',
        'jawab5', 'jawab6', 'jawab6follow',
        'devAnswer1', 'devAnswer2'
    ];
    
    // 3. MODIFIKASI TAMPILAN KELOMPOK (KUNCI PILIHAN)
    const elSelect = document.getElementById('kelompok-siswa');
    const savedKel = localStorage.getItem('kelompok-siswa');

    if (elSelect && savedKel) {
        // Buat Teks Biasa
        const textSpan = document.createElement('span');
        textSpan.innerHTML = `<strong>Kelompok ${savedKel}</strong>`;
        textSpan.style.textAlign = 'left';
        textSpan.style.width = '100%';
        textSpan.style.color = '#333';
        textSpan.style.padding = '5px 0';
        textSpan.style.flexGrow = '1';

        // Buat Input Rahasia (Hidden)
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'kelompok-siswa';
        hiddenInput.value = savedKel;

        // Tukar Elemen
        elSelect.parentNode.replaceChild(textSpan, elSelect);
        textSpan.parentNode.appendChild(hiddenInput);
    }
    
    // Inisialisasi tanggal dan waktu
    initDateTime();
    setInterval(updateTime, 1000);
    
// 4. INISIALISASI CHART (VERSI ANTI-ERROR / ANTI-BENTROK)
   const ctx = document.getElementById('myChart');
    if (ctx && typeof Chart !== 'undefined') {
        const chartCtx = ctx.getContext('2d');
        let existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();

        window.myChart = new Chart(chartCtx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Posisi Sisa Volume Bensin',
                    data: [], 
                    backgroundColor: '#392A8B', // Warna Ungu/Biru Khas Kel 1
                    borderColor: '#392A8B',
                    pointRadius: 8,
                    pointHoverRadius: 12,
                    showLine: true, borderWidth: 2, tension: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (e) => {
                    // Kunci Grafik saat Mode Review
                    if (document.body.classList.contains('review-mode-active')) return;

                    const activeChart = window.myChart;
                    if (!activeChart) return;

                    const elements = activeChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                    if (elements.length > 0) return;

                    const canvasPosition = Chart.helpers.getRelativePosition(e, activeChart);
                    const xVal = Math.round(activeChart.scales.x.getValueForPixel(canvasPosition.x));
                    // Pembulatan 1 desimal untuk Y (Liter)
                    const yVal = Math.round(activeChart.scales.y.getValueForPixel(canvasPosition.y) * 10) / 10;
                    
                    window.simpanTitik.push({ x: xVal, y: yVal });
                    
                    const label = String.fromCharCode(65 + activeChart.data.datasets[0].data.length);
                    activeChart.data.datasets[0].data.push({ x: xVal, y: yVal, label: label });
                    activeChart.update();
                    
                    const feedback = document.getElementById('graphFeedback');
                    if(feedback) feedback.innerHTML = ''; 
                },
                scales: {
                    x: { type: 'linear', position: 'bottom', title: { display: true, text: 'Jarak Tempuh (km)', font: {weight:'bold'} }, min: 0, max: 200, ticks: { stepSize: 10 } },
                    y: { title: { display: true, text: 'Sisa Bensin (Liter)', font: {weight:'bold'} }, min: 30, max: 45, ticks: { stepSize: 1 } }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (c) => `${c.raw.label}: (${c.parsed.x}, ${c.parsed.y})` } },
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
                const rawData = localStorage.getItem('dataReviewSiswa_Kel1');
                
                if (rawData) {
                    try {
                        const data = JSON.parse(rawData);
                        console.log('[SISWA MODE] Data ditemukan di localStorage:', data.length, 'items');
                        
                        // Validasi kelompok
                        const kelompokData = data.find(item => item.question === 'Info Kelompok');
                        if (kelompokData && kelompokData.answer === '1') {
                            dataToLoad = data;
                            console.log('[SISWA MODE] ✅ Data localStorage valid untuk Kelompok 1');
                        } else {
                            console.warn('[SISWA MODE] ⚠️ Data localStorage bukan untuk Kelompok 1');
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
                                if (kelompokData && kelompokData.answer === '1') {
                                    dataToLoad = data;
                                    console.log('[SISWA MODE] ✅ Data Supabase valid:', data.length, 'items');
                                } else {
                                    console.warn('[SISWA MODE] ⚠️ Data Supabase bukan untuk Kelompok 1');
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

// Fungsi Bantuan (Hint)
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

// =========================================
// 2. LOGIKA MATEMATIKA (Fase 2, 3, & Uji Coba)
// =========================================
async function checkAnswer(type) {
    let feedback, message; 
    let isCorrect = false; // Default status jawaban adalah Salah

    // KUNCI JAWABAN (A(80, 39), B(150, 34.1)) -> m = -0.07, c = 44.6
    const KUNCI_M = -0.07;
    const VALID_ANSWERS = [
        "-0.07x+44.6", "y=-0.07x+44.6", 
        "-0,07x+44,6", "y=-0,07x+44,6"
    ];

    // --- METODE BU RINA ---
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
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Rumus akhirnya adalah <strong>y = -0.07x + 44.6</strong> (atau -0,07x + 44,6).';
            await saveAnswer('Metode Bu Rina', rawInput, true);
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Kurang tepat. Cek lagi operasi pada persamaannya.';
            await saveAnswer('Metode Bu Rina', rawInput, false);
        }
    } 
    // --- METODE PAK BUDI ---
    else if (type === 'metode2') { 
        feedback = document.getElementById('feedback_metode2');
        let gradInput = document.getElementById('jawab_gradien').value.trim();
        
        if (gradInput === '') {
            message = `<i class="fa-solid fa-circle-exclamation"></i> Hitung gradiennya terlebih dahulu.`;
            feedback.innerHTML = message; feedback.className = 'feedback wrong'; return;
        }

        let grad = parseFloat(gradInput.replace(',', '.'));
        let rawInput = document.getElementById('jawab_metode2').value.toLowerCase();
        let ans = rawInput.replace(/\s/g, '');

        if (grad !== KUNCI_M) {
            message = `<i class="fa-solid fa-circle-exclamation"></i> Gradien salah. Hitung kembali gradiennya.`;
            feedback.innerHTML = message; feedback.className = 'feedback wrong'; return;
        }

        if (VALID_ANSWERS.some(kunci => ans.includes(kunci.replace("y=", "")))) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Sempurna!</strong> Pak Budi menemukan konsumsi bensin 0.07 liter/km dan volume bensin sebelum jalan adalah 44.6 liter.';
            await saveAnswer('Metode Pak Budi', rawInput, true);
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Gradien benar, tapi persamaan akhirnya salah hitung.';
            await saveAnswer('Metode Pak Budi', rawInput, false);
        }
    }
    // --- KESIMPULAN ---
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

     // --- UJI COBA 1 (Menempuh 300 km) ---
    else if (type === 5) { 
        feedback = document.getElementById('feedback5');
        let ansRaw = document.getElementById('jawab5').value;
        let ans = parseFloat(ansRaw.replace(',', '.')); 

        if (Math.abs(ans - 23.6) <= 0) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Sisa bensin setelah menempuh 300 km adalah 23.6 liter.';
            await saveAnswer('Menempuh 300 km', ansRaw, true);
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Salah. Substitusi nilai x = 300 pada persamaan final.';
            await saveAnswer('Menempuh 300 km', ansRaw, false);
        }
    }
    // --- UJI COBA 2 (Jarak Ketika Kehabisan Bensin) ---
    else if (type === 6) { 
        feedback = document.getElementById('feedback6');
        let ansString = document.getElementById('jawab6').value; // Ambil teks asli
        let ans = parseFloat(ansString.replace(',', '.'));      // Ubah ke angka

        // Hitungan: 0 = -0.07x + 44.6  ->  0.07x = 44.6  ->  x = 44.6 / 0.07 = 637.14
        // Kita beri toleransi +/- 1 km (jadi jawab 637 atau 637.1 dianggap benar)
        if (!isNaN(ans) && Math.abs(ans - 637.14) <= 0.14) {
            isCorrect = true;
            message = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Jarak tempuh mobil ketika bensin habis adalah sekitar 637 km.';
            await saveAnswer('Jarak Bensin Habis', ansString, true);
        } else {
            message = '<i class="fa-solid fa-circle-xmark"></i> Salah. Substitusi nilai y = 0 (bensin habis) pada persamaan finalmu.';
            await saveAnswer('Jarak Bensin Habis', ansString, false);
        }
    }

    // --- RENDER FINAL ---
    feedback.innerHTML = message;
    // Baris ini akan menentukan warna berdasarkan nilai isCorrect di atas
    feedback.className = isCorrect ? 'feedback correct' : 'feedback wrong';

    // Check if all answers are completed
    checkCompletion();
}

// =========================================
// 3. FASE 1: CEK KOORDINAT INPUT MANUAL
// =========================================
async function checkCoordAnswer(point) {
    const feedback = document.getElementById('coordFeedback');
    let correctX, correctY, inputX, inputY;
    if (point === 'A') {
        correctX = 80; correctY = 39;
        inputX = parseFloat(document.getElementById('coordAx').value);
        inputY = parseFloat(document.getElementById('coordAy').value);
    } else if (point === 'B') {
        correctX = 150; correctY = 34.1;
        inputX = parseFloat(document.getElementById('coordBx').value);
        inputY = parseFloat(document.getElementById('coordBy').value);
    } else { return; }

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
        feedback.className = 'feedback wrong'; // Diganti wrong agar merah jika salah
        
        // [VALIDASI BARU] Simpan ke database
        await saveAnswer(`Koordinat Titik ${point}`, `(${inputX}, ${inputY})`, false);
    }
}

// =========================================
// UPDATE FUNGSI CEK GRAFIK (FEEDBACK BERTINGKAT)
// =========================================

async function checkGraphPoints() {
    if (!window.myChart) return;

    // Ambil data titik yang sudah digambar siswa
    const points = myChart.data.datasets[0].data;
    const feedback = document.getElementById('graphFeedback');

    // Target Koordinat Kelompok 1
    // Titik A: (80, 39)
    // Titik B: (150, 34.1)
    const hasA = points.some(p => Math.abs(p.x - 80) <= 0 && Math.abs(p.y - 39) <= 0);
    const hasB = points.some(p => Math.abs(p.x - 150) <= 0 && Math.abs(p.y - 34.1) <= 0);

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
            Tapi <strong>Titik B</strong> (150, 34.1) belum ketemu. Cari lagi ya!
        `;
        feedback.className = 'feedback wrong'; // Warna Merah (atau kuning jika diatur CSS)
        
        // [VALIDASI BARU] Simpan ke database
        await saveAnswer('Visualisasi Grafik Kartesius', 'Hanya titik A benar', false);
    } 
    
    // KONDISI 2: BARU MENEMUKAN SATU TITIK (B SAJA)
    else if (!hasA && hasB) {
        feedback.innerHTML = `
            <i class="fa-solid fa-circle-exclamation"></i> <strong>Bagus! Titik B sudah pas.</strong><br>
            Tapi <strong>Titik A</strong> (80, 39) belum ketemu. Cari lagi ya!
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
                Cari: <strong>A(80, 39)</strong> dan <strong>B(150, 34.1)</strong>.
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
    
    const validEquations = [
        "-0.07x+44.6", "y=-0.07x+44.6",
        "-0,07x+44,6", "y=-0,07x+44,6"
    ];

    if (validEquations.some(eq => equation.includes(eq.replace("y=", "")))) {
        feedback.innerHTML = '<i class="fa-solid fa-check-circle"></i> <strong>Benar!</strong> Persamaan final telah dikonfirmasi.';
        feedback.className = 'feedback correct';
    } else {
        feedback.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Persamaan belum tepat. Pastikan formatnya y = mx + c (bisa pakai titik atau koma).';
        feedback.className = 'feedback wrong';
    }
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

// Fungsi untuk mengecek apakah semua jawaban telah diisi
function checkCompletion() {
    const requiredIds = [
        'coordAx', 'coordAy', 'coordBx', 'coordBy',
        'jawab_metode1', 'jawab_gradien', 'jawab_metode2',
        'jawab_kesimpulan', 'finalEquation',
        'jawab5', 'jawab6',
        'devAnswer1', 'devAnswer2'
    ];

    const allFilled = requiredIds.every(id => {
        const element = document.getElementById(id);
        return element && element.value.trim() !== '';
    });

    // Check if graph has points A and B
    let graphComplete = false;
    if (window.myChart) {
        const points = window.myChart.data.datasets[0].data;
        const hasA = points.some(p => Math.abs(p.x - 80) <= 1 && Math.abs(p.y - 39) <= 1);
        const hasB = points.some(p => Math.abs(p.x - 150) <= 1 && Math.abs(p.y - 34.1) <= 1);
        graphComplete = hasA && hasB;
    }

    if (allFilled && graphComplete && !localStorage.getItem('submitted')) {
        document.getElementById('confirmationModal').style.display = 'flex';
    }
}

// =========================================
// 3. SUBMIT DATA (Fixed for Group 1)
// =========================================

function validateAndOpenModal() {
    const ids = [
        'nama-siswa', 'kelompok-siswa',
        'coordAx', 'coordAy', 'coordBx', 'coordBy',
        'jawab_metode1', 'jawab_gradien', 'jawab_metode2',
        'jawab_kesimpulan', 'finalEquation',
        'jawab5', 'jawab6',
        'devAnswer1', 'devAnswer2'
    ];

    let emptyCount = 0;
    
    // Cek setiap ID, tandai merah jika kosong
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value.trim() === '') {
            el.style.borderColor = 'red'; 
            emptyCount++;
        } else if (el) {
            el.style.borderColor = '#ddd'; 
        }
    });

    // Tampilkan Alert yang Detail jika ada yang kosong
    if (emptyCount > 0) {
        alert(`Masih ada ${emptyCount} kolom jawaban yang belum diisi! Silakan lengkapi yang berwarna merah.`);
        
        // Scroll otomatis ke kotak kosong pertama
        const firstEmpty = ids.find(id => {
             const el = document.getElementById(id); 
             return el && el.value.trim() === '';
        });
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

    const isEq = (v) => { if(!v) return false; const c = v.toLowerCase().replace(/\s/g,'').replace(/,/g, '.'); return c.includes('-0.07x') && c.includes('44.6'); };
    const pushData = (q, ans, corr) => dataToSave.push({ student_name: sName, question: q, answer: ans, is_correct: corr });

    // === VALIDASI SOAL UTAMA ===
    pushData('Metode Bu Rina', document.getElementById('jawab_metode1').value, isEq(document.getElementById('jawab_metode1').value));
    pushData('Metode Pak Budi', document.getElementById('jawab_metode2').value, isEq(document.getElementById('jawab_metode2').value));
    pushData('Visualisasi Grafik Kartesius', JSON.stringify(window.simpanTitik), true);

    // Soal tambahan
    let v5 = parseFloat(document.getElementById('jawab5').value.replace(',','.'));
    pushData('Sisa Bensin 300km', document.getElementById('jawab5').value, Math.abs(v5 - 23.6) < 1);

    let v6 = parseFloat(document.getElementById('jawab6').value.replace(',','.'));
    pushData('Jarak Bensin Habis', document.getElementById('jawab6').value, Math.abs(v6 - 637) < 2);

    // === VALIDASI BARU: 8 PERTANYAAN TAMBAHAN ===
    
    // 1 & 2. Koordinat Titik A dan B
    const coordAx = parseFloat(document.getElementById('coordAx').value);
    const coordAy = parseFloat(document.getElementById('coordAy').value);
    const coordBx = parseFloat(document.getElementById('coordBx').value);
    const coordBy = parseFloat(document.getElementById('coordBy').value);
    
    pushData('Koordinat A', `(${coordAx}, ${coordAy})`, coordAx === 80 && coordAy === 39);
    pushData('Koordinat B', `(${coordBx}, ${coordBy})`, coordBx === 150 && coordBy === 34.1);
    
    // 3. Gradien (Metode 2)
    let gVal = parseFloat(document.getElementById('jawab_gradien').value.replace(',','.'));
    pushData('Gradien', document.getElementById('jawab_gradien').value, Math.abs(gVal - (-0.07)) < 0.001);
    
    // 4. Visualisasi Grafik Kartesius
    const points = window.simpanTitik || [];
    const hasA = points.some(p => Math.abs(p.x - 80) <= 0 && Math.abs(p.y - 39) <= 0);
    const hasB = points.some(p => Math.abs(p.x - 150) <= 0 && Math.abs(p.y - 34.1) <= 0);
    pushData('Visualisasi Grafik Kartesius', `${points.length} titik`, hasA && hasB);
    
    // 5. Refleksi (Ya atau Tidak)
    const kesimpulan = document.getElementById('jawab_kesimpulan').value;
    pushData('Refleksi', kesimpulan, kesimpulan === 'Ya' || kesimpulan === 'Tidak');
    
    // 6. Persamaan Final
    pushData('Persamaan Final', document.getElementById('finalEquation').value, isEq(document.getElementById('finalEquation').value));
    
    // 7. Analisis Rumus (>15 karakter = benar)
    const analisisRumus = document.getElementById('devAnswer1').value;
    pushData('Analisis Rumus', analisisRumus, analisisRumus.length > 15);
    
    // 8. Kapan Menggunakan Metode (>15 karakter = benar)
    const kapanMetode = document.getElementById('devAnswer2').value;
    pushData('Pendapat Kelompok', kapanMetode, kapanMetode.length > 15);

    // === DATA INFO (TIDAK DIVALIDASI) ===
    pushData('Info Kelompok', document.getElementById('kelompok-siswa').value, null);

    // Simpan Link Presentasi jika ada
    const linkPres = document.getElementById('link_presentasi');
    if (linkPres && linkPres.value) {
        pushData('Link Presentasi', linkPres.value, null);
    }

    if (supabaseClient) await supabaseClient.from('student_answers').insert(dataToSave);
    
    // 1. SIMPAN DATA JAWABAN KE MEMORI SEMENTARA (UNTUK DILIHAT DI CLOSING)
    localStorage.removeItem('dataReviewSiswa');
    localStorage.setItem('dataReviewSiswa_Kel1', JSON.stringify(dataToSave));
    
    // 2. Simpan nama siswa ke localStorage untuk review mode
    localStorage.setItem('nama-siswa', sName);
    
    // 3. Simpan kelompok siswa ke localStorage untuk redirect ke halaman yang benar
    const kelompokSiswa = document.getElementById('kelompok-siswa').value || '1';
    localStorage.setItem('kelompok-siswa', kelompokSiswa);
    
    // 4. Tandai sudah selesai
    localStorage.setItem('submitted', 'true'); 
    
    // 5. Pindah halaman
    window.location.href = 'closing.html';
}

// =========================================
// 4. MODE KOREKSI GURU
// =========================================

function isiFormulirOtomatis(data) {
    const dataSiswa = data.find(item => item.student_name && item.student_name !== 'Tanpa Nama');
    if (dataSiswa) document.getElementById('nama-siswa').value = dataSiswa.student_name;
    
    const mapSoal = {
        'Visualisasi Grafik Kartesius' : 'Grafik Chart',
        'Metode Bu Rina': 'jawab_metode1', 
        'Gradien': 'jawab_gradien', 
        'Metode Pak Budi': 'jawab_metode2',
        'Refleksi': 'jawab_kesimpulan', 
        'Alasan Kesimpulan': 'reasonText', 
        'Persamaan Final': 'finalEquation',
        'Sisa Bensin 300km': 'jawab5', 
        'Jarak Bensin Habis': 'jawab6',
        'Info Kelompok': 'kelompok-siswa', 
        'Analisis Rumus': 'devAnswer1', 
        'Pendapat Kelompok': 'devAnswer2',
        'Link Presentasi': 'link_presentasi'
    };

    data.forEach(item => {
        // Restore Grafik
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
        // Restore Koordinat A
        if (item.question === 'Koordinat A') {
            const match = item.answer.match(/-?\d+(\.\d+)?/g);
            if(match) { document.getElementById('coordAx').value = match[0]; document.getElementById('coordAy').value = match[1]; }
        }
        // Restore Koordinat B
        if (item.question === 'Koordinat B') {
            const match = item.answer.match(/-?\d+(\.\d+)?/g);
            if(match) { document.getElementById('coordBx').value = match[0]; document.getElementById('coordBy').value = match[1]; }
        }
        // Restore input biasa
        let id = mapSoal[item.question];
        if (id) {
            let el = document.getElementById(id);
            if (el) {
                el.value = item.answer;
                if (item.is_correct !== null) el.style.backgroundColor = item.is_correct ? '#d4edda' : '#f8d7da';
                
                // Tampilkan section jika perlu
                if (item.question === 'Persamaan Final') {
                    const finalSection = document.getElementById('finalEquationSection');
                    if (finalSection) finalSection.classList.remove('hidden');
                }
                if (item.question === 'Alasan Kesimpulan') {
                    const reasonSection = document.getElementById('reasonSection');
                    if (reasonSection) reasonSection.classList.remove('hidden');
                }
                // Restore Link Presentasi
                if (item.question === 'Link Presentasi' && item.answer) {
                    const btnOpen = document.createElement('a');
                    btnOpen.href = item.answer; btnOpen.target = "_blank";
                    btnOpen.innerHTML = '<i class="fa-solid fa-external-link-alt"></i> Buka Link';
                    btnOpen.style.cssText = "display:block; margin-top:5px; padding:5px; background:#2196F3; color:white; text-align:center; border-radius:5px; text-decoration:none;";
                    el.parentNode.appendChild(btnOpen);
                }
            }
        }
    });
}

// --- Matikan Input ---
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

    const floatingBtn = document.createElement('button');
    floatingBtn.id = 'btnKembaliClosing';
    floatingBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Kembali ke Penutup';
    floatingBtn.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #333; color: white; padding: 15px 25px; border-radius: 50px; border: none; font-size: 1rem; cursor: pointer; z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.3);";
    floatingBtn.onclick = function() { window.location.href = 'closing.html'; };
    document.body.appendChild(floatingBtn);
    
    if (window.myChart) {
        window.myChart.options.plugins.tooltip.enabled = false;
        window.myChart.update();
    }
    
    // Tampilkan Banner MODE REVIEW
    const banner = document.createElement('div');
    banner.style.cssText = "position: fixed; top: 0; left: 0; right: 0; background: #ffeb3b; color: #333; padding: 15px 20px; text-align: center; font-weight: bold; font-size: 16px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.2);";
    banner.innerHTML = '<i class="fa-solid fa-eye"></i> MODE REVIEW: Jawaban Anda telah tersimpan.';
    document.body.prepend(banner);
    document.body.style.marginTop = '80px';
}

window.addEventListener('load', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const namaSiswa = urlParams.get('siswa');
    
    if (namaSiswa) {
        // Tampilkan banner mode koreksi segera
        const banner = document.createElement('div');
        banner.style.cssText = "position: fixed; top: 0; left: 0; right: 0; background: #ff9800; color: white; padding: 15px 20px; text-align: center; font-weight: bold; font-size: 16px; z-index: 9999; box-shadow: 0 2px 10px rgba(0,0,0,0.2);";
        banner.innerHTML = `<i class="fa-solid fa-lock"></i> MODE KOREKSI: Jawaban <strong>${namaSiswa}</strong>`;
        document.body.prepend(banner);
        document.body.style.marginTop = '80px';
        
        // Disable buttons
        document.querySelectorAll('#btnFinalSubmit, .chart-controls button, .btn-check').forEach(el => el.style.display = 'none');
        
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
        
        // Disable inputs after loading data
        document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
        document.getElementById('nama-siswa').value = namaSiswa;
    }
});

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

// =========================================
// 5. FITUR KOMENTAR ONLINE (SUPABASE)
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

    if (!name || !text) { alert("Nama dan Pesan harus diisi!"); return; }
    
    // Gunakan flag khusus 'KOMENTAR_KEL_1'
    const { error } = await supabaseClient.from('student_answers').insert([{
        student_name: name, 
        question: 'KOMENTAR_KEL_1', 
        answer: text, 
        is_correct: false 
    }]);

    if (error) {
        alert("Gagal kirim: " + error.message);
    } else {
        document.getElementById('commentText').value = ''; 
        loadCommentsFromSupabase(); 
        alert("Tanggapan terkirim!");
    }
}

async function loadCommentsFromSupabase() {
    if (!supabaseClient) return;

    const { data } = await supabaseClient
        .from('student_answers')
        .select('*')
        .eq('question', 'KOMENTAR_KEL_1')
        .order('created_at', { ascending: false });

    if (data) {
        const list = document.getElementById('comments-list');
        if (data.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#ccc;">Belum ada tanggapan.</p>';
            return;
        }

        let html = '';
        data.forEach(item => {
            const time = new Date(item.created_at).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
            html += `
                <div style="background:white; margin-bottom:10px; padding:10px; border-radius:8px; border:1px solid #eee;">
                    <div style="font-weight:bold; color:#11998e; display:flex; justify-content:space-between;">
                        <span><i class="fa-solid fa-user-circle"></i> ${item.student_name}</span>
                        <span style="font-size:0.8rem; color:#999;">${time}</span>
                    </div>
                    <div style="color:#333; margin-top:5px;">${item.answer}</div>
                </div>
            `;
        });
        list.innerHTML = html;
    }
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