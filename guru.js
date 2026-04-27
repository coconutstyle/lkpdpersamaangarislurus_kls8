// =========================================
// 1. SETUP SUPABASE
// =========================================
const supabaseUrl = 'https://cydgsvqybhhfedoazfok.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5ZGdzdnF5YmhoZmVkb2F6Zm9rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDc5ODAsImV4cCI6MjA4MzQyMzk4MH0.4p4It2z4qVyLNydXwNdOHx9es7R5zAbB-EevFZVk5Y8';

let dbClient = null;

try {
    if (typeof window.supabase !== 'undefined') {
        dbClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    } else {
        console.error("Library Supabase belum terload di HTML.");
    }
} catch (err) {
    console.error("Gagal inisialisasi:", err);
}

// =========================================
// 2. FUNGSI LOGIN (Tanpa Persistensi)
// =========================================
function bukaPintu() {
    const pin = document.getElementById('pinInput').value.trim();
    if(pin === 'LKPDpglKLS8') { 
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
    if(!dbClient) return;

    statusText.innerText = "Sedang memuat data...";
    statusText.style.color = "orange";

    try {
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
// 4. RENDER TABEL
// =========================================
function processAndRender(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = ""; 

    if (!data || data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Belum ada siswa submit.</td></tr>`;
        return;
    }

    const students = {};
    const ignoredQuestions = ['Info Kelompok', 'nama-siswa', 'Link Presentasi', 'Pilihan Strategi', 'Alasan Strategi', 'Identifikasi Variabel', 'Alasan Kesimpulan', 'KOMENTAR_KEL_1', 'KOMENTAR_KEL_2', 'KOMENTAR_KEL_3', 'KOMENTAR_KEL_4', 'KOMENTAR_KEL_5'];
    
    data.forEach(row => {
        const name = row.student_name || "Tanpa Nama";
        if (!students[name]) {
            students[name] = { 
                name: name, 
                lastSubmit: row.created_at || row.timestamp, 
                correct: 0, 
                wrong: 0, 
                kelompok: null, 
                questions: {} 
            };
        }
        
        if (!ignoredQuestions.includes(row.question)) {
            if (!students[name].questions[row.question]) {
                students[name].questions[row.question] = row;
                if (row.is_correct === true) students[name].correct++;
                else if (row.is_correct === false) students[name].wrong++;
            }
        }
        
        if (row.question === 'Info Kelompok') {
            students[name].kelompok = row.answer;
        }
    });

    Object.values(students).forEach(s => {
        const tr = document.createElement('tr');
        let link = s.kelompok 
            ? `lkpdkel${s.kelompok}.html?mode=review&siswa=${encodeURIComponent(s.name)}`
            : "javascript:alert('Data kelompok tidak ditemukan di database!')";

        tr.innerHTML = `
            <td><input type="checkbox" class="student-checkbox" value="${s.name}" onchange="cekTombolHapus()"></td>
            <td>${s.name} ${s.kelompok ? `<span class='badge'>Kel ${s.kelompok}</span>` : `<span style="color:red;">(Kelompok Kosong)</span>`}</td>
            <td>${new Date(s.lastSubmit).toLocaleString('id-ID')}</td>
            <td><span style="color:green;">${s.correct} Benar</span> / <span style="color:red;">${s.wrong} Salah</span></td>
            <td>
                <div style="display:flex; gap:5px;">
                    <a href="${link}" ${s.kelompok ? 'target="_blank"' : ''} class="btn-review">Lihat</a>
                    <button onclick="hapusSiswa('${s.name}')" class="btn-delete-small"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// =========================================
// 5. FITUR HAPUS (SATUAN & MASSAL)
// =========================================

function cekTombolHapus() {
    const checked = document.querySelectorAll('.student-checkbox:checked');
    const btnMassal = document.getElementById('btnHapusMassal');
    const countDisplay = document.getElementById('countDelete');
    
    if (checked.length > 0) {
        btnMassal.style.display = 'flex';
        countDisplay.innerText = checked.length;
    } else {
        btnMassal.style.display = 'none';
    }
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.student-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    cekTombolHapus();
}

async function hapusSiswa(nama) {
    if (!confirm(`Hapus semua data jawaban dari ${nama}?`)) return;
    try {
        const { error } = await dbClient.from('student_answers').delete().eq('student_name', nama);
        if (error) throw error;
        alert("Data berhasil dihapus.");
        ambilDataSupabase(); 
    } catch (err) {
        alert("Gagal menghapus data.");
    }
}

async function hapusTerpilih() {
    const checked = document.querySelectorAll('.student-checkbox:checked');
    const namaSiswa = Array.from(checked).map(cb => cb.value);
    if (!confirm(`Hapus ${namaSiswa.length} siswa terpilih?`)) return;
    const { error } = await dbClient.from('student_answers').delete().in('student_name', namaSiswa);
    if (!error) { alert("Data berhasil dihapus!"); ambilDataSupabase(); }
}