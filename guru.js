// =========================================
// 1. SETUP SUPABASE
// =========================================
const supabaseUrl = 'https://cydgsvqybhhfedoazfok.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGdzdnF5YmhoZmVkb2F6Zm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDc5ODAsImV4cCI6MjA4MzQyMzk4MH0.4p4It2z4qVyLNydXwNdOHx9es7R5zAbB-EevFZVk5Y8';
const urlParams = new URLSearchParams(window.location.search);
const isGuruReview = urlParams.get('siswa') !== null;

// Hanya redirect jika BUKAN guru dan BELUM submit
if (!isGuruReview && !localStorage.getItem('submitted')) {
    alert("Kamu belum mengerjakan LKPD!");
    window.location.href = 'index.html';
}

// GANTI NAMA VARIABEL: JANGAN PAKAI 'supabase', PAKAI 'dbClient'
let dbClient = null;

try {
    // Panggil window.supabase (milik library) untuk mengisi dbClient kita
    if (typeof window.supabase !== 'undefined') {
        dbClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log("Database Siap: dbClient created.");
    } else {
        console.error("Library Supabase belum terload di HTML.");
    }
} catch (err) {
    console.error("Gagal inisialisasi:", err);
}

// =========================================
// 2. FUNGSI LOGIN
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    // Cek apakah sebelumnya sudah login di sesi ini
    if (sessionStorage.getItem('guru_logged_in') === 'true') {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        ambilDataSupabase();
    }
});

function bukaPintu() {
    const pin = document.getElementById('pinInput').value.trim();
    if(pin === 'LKPDpglKLS8') { 
        // Simpan status login ke sesi browser
        sessionStorage.setItem('guru_logged_in', 'true');
        
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        ambilDataSupabase();
    } else {
        document.getElementById('pesanError').style.display = 'block';
    }
}

// =========================================
// 3. AMBIL DATA DARI SUPABASE
// =========================================
async function ambilDataSupabase() {
    const statusText = document.getElementById('statusKoneksi');
    const tableBody = document.getElementById('tableBody');
    
    // Cek apakah dbClient sudah siap
    if(!dbClient) { 
        alert("Error: Library Supabase tidak terhubung."); 
        return; 
    }

    statusText.innerText = "Sedang memuat data...";
    statusText.style.color = "orange";

    try {
        // PERHATIKAN: Kita pakai dbClient, bukan supabase
        const { data, error } = await dbClient
            .from('student_answers')
            .select('*')
            .order('id', { ascending: false });

        if (error) throw error;

        processAndRender(data);
        
        statusText.innerText = "Data update: " + new Date().toLocaleTimeString();
        statusText.style.color = "green";

    } catch (err) {
        console.error(err);
        statusText.innerText = "Gagal ambil data.";
        statusText.style.color = "red";
    }
}

// =========================================
// 4. RENDER TABEL (TAMPILKAN KE LAYAR)
// =========================================
function processAndRender(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = ""; // Bersihkan isi tabel

    // Reset Checkbox
    const selectAllBox = document.getElementById('selectAll');
    if(selectAllBox) selectAllBox.checked = false;
    cekTombolHapus(); 

    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Data Kosong / Belum ada siswa submit.</td></tr>`;
        return;
    }

    // --- Grouping Data Siswa ---
    const students = {};
    
    // [FIX] Daftar pertanyaan yang TIDAK dihitung dalam skor
    const ignoredQuestions = [
        'Info Kelompok',
        'nama-siswa',
        'link_presentasi',
        'Refleksi',
        'Feedback',
        'Saran',
        'Komentar',
        'Tanggapan'
    ];
    
    data.forEach(row => {
        const name = row.student_name || "Tanpa Nama";
        if (!students[name]) {
            students[name] = { 
                name: name, 
                lastSubmit: row.timestamp, 
                correct: 0, 
                wrong: 0,
                kelompok: null,  // Akan dideteksi dari pertanyaan
                questions: {}     // [FIX] Track pertanyaan unik
            };
        }
        
        // [FIX] Hanya hitung sekali per pertanyaan (ambil yang terakhir)
        const question = row.question;
        
        // Abaikan pertanyaan yang tidak punya validasi
        const isIgnored = ignoredQuestions.some(ignored => 
            question && question.toLowerCase().includes(ignored.toLowerCase())
        );
        
        if (!isIgnored && question) {
            if (!students[name].questions[question] || 
                new Date(row.created_at) > new Date(students[name].questions[question].created_at)) {
                students[name].questions[question] = row;
            }
        }
        
        // Deteksi kelompok dari pertanyaan "Info Kelompok"
        if (row.question === 'Info Kelompok' && row.answer) {
            students[name].kelompok = row.answer;
        }
    });
    
    // [FIX] Hitung benar/salah dari pertanyaan yang tervalidasi saja
    Object.values(students).forEach(student => {
        Object.values(student.questions).forEach(q => {
            // Pastikan hanya hitung yang punya is_correct (boolean)
            if (q.is_correct === true) {
                student.correct++;
            } else if (q.is_correct === false) {
                student.wrong++;
            }
            // Jika is_correct = null/undefined, tidak dihitung
        });
    });

    // --- Masukkan ke HTML ---
    Object.values(students).forEach(s => {
        const tr = document.createElement('tr');
        const safeName = encodeURIComponent(s.name);
        const cleanName = s.name.replace(/'/g, "\\'"); // Escape tanda kutip
        
        // Cek timestamp valid atau tidak
        let timeString = "-";
        if(s.lastSubmit) {
            timeString = new Date(s.lastSubmit).toLocaleString('id-ID');
        }

        // Tentukan link berdasarkan kelompok
        let link = '#';
        if (s.kelompok) {
            link = `lkpdkel${s.kelompok}.html?mode=review`;
        } else {
            // Jika tidak ada info kelompok, coba deteksi dari nama
            const kelMatch = s.name.match(/kelompok\s*(\d)/i);
            if (kelMatch) {
                link = `lkpdkel${kelMatch[1]}.html?mode=review&siswa=${safeName}`;
            }
        }
        
        // Tambahkan parameter siswa ke link
        if (link !== '#') {
            link += (link.includes('?') ? '&' : '?') + `siswa=${safeName}`;
        }

        // Tampilkan info kelompok jika ada
        const kelompokBadge = s.kelompok 
            ? `<span style="background:#007bff; color:white; padding:2px 8px; border-radius:10px; font-size:0.75rem; margin-left:5px;">Kel ${s.kelompok}</span>` 
            : '';

        tr.innerHTML = `
            <td style="text-align:center;">
                <input type="checkbox" class="student-checkbox" value="${cleanName}" onchange="cekTombolHapus()">
            </td>
            <td style="font-weight:bold;">${s.name}${kelompokBadge}</td>
            <td>${timeString}</td>
            <td>
                <span style="color:green;">${s.correct} Benar</span> / 
                <span style="color:red;">${s.wrong} Salah</span>
            </td>
            <td>
                <a href="${link}" target="_blank" class="btn-review">
                    <i class="fa-solid fa-eye"></i> Lihat
                </a>
                <button onclick="hapusSiswa('${cleanName}')" class="btn-delete-small">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// =========================================
// 5. FITUR HAPUS
// =========================================
function toggleSelectAll() {
    const mainBox = document.getElementById('selectAll');
    const boxes = document.querySelectorAll('.student-checkbox');
    boxes.forEach(b => b.checked = mainBox.checked);
    cekTombolHapus();
}

function cekTombolHapus() {
    const count = document.querySelectorAll('.student-checkbox:checked').length;
    const btn = document.getElementById('btnHapusMassal');
    const span = document.getElementById('countDelete');
    
    if(btn) {
        if(count > 0) {
            btn.style.display = 'inline-flex';
            if(span) span.innerText = count;
        } else {
            btn.style.display = 'none';
        }
    }
}

async function hapusTerpilih() {
    const boxes = document.querySelectorAll('.student-checkbox:checked');
    const names = Array.from(boxes).map(b => b.value);
    
    if(names.length === 0) return;
    
    if(confirm(`Hapus ${names.length} siswa terpilih secara permanen?`)) {
        // Ganti 'supabase' jadi 'dbClient'
        await dbClient.from('student_answers').delete().in('student_name', names);
        ambilDataSupabase();
    }
}

async function hapusSiswa(nama) {
    if(confirm(`Hapus data siswa: ${nama}?`)) {
        // Ganti 'supabase' jadi 'dbClient'
        await dbClient.from('student_answers').delete().eq('student_name', nama);
        ambilDataSupabase();
    }
}