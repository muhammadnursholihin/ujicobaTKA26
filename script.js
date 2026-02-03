const URL_CLOUD = "https://script.google.com/macros/s/AKfycbwYJ1CrvvDHhqkE7hB57gFBERQ8yMmzkApYZpm6FbXMOvuXtwM_X7N2SVQqZh4O6AoU/exec";
let bankSoal = [], cloudSiswa = [], cloudHasil = [], currentUser = null;
let pelanggaran = 0, isWarningActive = false, jawabanSiswa = {};

window.onload = async () => {
    await tarikDataCloud();
    document.getElementById('loader').style.display = "none";
};

async function tarikDataCloud() {
    try {
        const res = await fetch(URL_CLOUD);
        const data = await res.json();
        bankSoal = data.soal;
        cloudSiswa = data.siswa;
        cloudHasil = data.hasil || []; // Ambil data hasil untuk admin
    } catch (e) { alert("Koneksi Cloud Gagal!"); }
}

async function prosesLogin() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (u === "admin" && p === "admin123") {
        currentUser = { nama: "Admin TKA", role: "ADMIN" };
        document.getElementById('admin-menu').style.display = "block";
        document.getElementById('menu-ujian').style.display = "none";
        showPage('admin-soal');
    } else {
        const s = cloudSiswa.find(x => x.user == u && x.pass == p);
        if (!s) return alert("User/Pass Salah!");
        if (s.blokir === "YA") return alert("AKUN DIBLOKIR!");
        currentUser = { nama: s.nama, user: u, role: "SISWA" };
        showPage('ujian');
    }

    document.getElementById('user-display').innerText = currentUser.nama;
    document.getElementById('login-overlay').style.display = "none";
    document.getElementById('main-dashboard').style.display = "flex";
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.style.display = "none");
    document.getElementById('page-' + id).style.display = "block";
    
    if(id === 'admin-soal') renderTabelSoal();
    if(id === 'admin-siswa') renderTabelSiswa();
    if(id === 'admin-rekap') renderTabelRekap();
}

function renderTabelSoal() {
    const html = bankSoal.map((s, i) => `<tr><td>${i+1}</td><td>${s.mapel}</td><td>${s.tipe}</td><td>${s.tanya.substring(0,30)}..</td></tr>`).join('');
    document.querySelector('#tabel-soal tbody').innerHTML = html;
}

function renderTabelSiswa() {
    const html = cloudSiswa.map(s => `<tr><td>${s.nama}</td><td>${s.user}</td><td>${s.blokir === "YA" ? "🔴 BLOKIR" : "🟢 AKTIF"}</td><td><button onclick="bukaBlokir('${s.user}')">Reset</button></td></tr>`).join('');
    document.querySelector('#tabel-siswa tbody').innerHTML = html;
}

function renderTabelRekap() {
    const html = cloudHasil.map(h => `<tr><td>${h.nama}</td><td>${h.skor}</td><td>${h.waktu}</td></tr>`).join('');
    document.querySelector('#tabel-rekap tbody').innerHTML = html;
}

// --- FUNGSI UJIAN ---
function startUjian() {
    const t = prompt("Token Ujian:");
    if (t !== "TKA26") return alert("Token Salah!");
    document.getElementById('welcome-box').style.display = "none";
    document.getElementById('area-soal').style.display = "block";
    renderSoal();
    aktifkanAntiCheat();
}

function renderSoal() {
    let h = "";
    bankSoal.forEach((s, i) => {
        h += `<div class="card"><strong>${i+1}. ${s.tanya}</strong><br>`;
        if (s.tipe === "PG") {
            ["A","B","C","D"].forEach(o => h += `<label class="opsi-item"><input type="radio" name="q${i}" onchange="jawabanSiswa[${i}]='${o}'"> ${o}. ${s[o]}</label>`);
        } else {
            h += `<textarea onkeyup="jawabanSiswa[${i}]=this.value" style="width:100%; height:60px; margin-top:10px;"></textarea>`;
        }
        h += `</div>`;
    });
    document.getElementById('render-soal').innerHTML = h;
}

function aktifkanAntiCheat() {
    window.onblur = async () => {
        if (isWarningActive || currentUser.role === "ADMIN") return;
        isWarningActive = true;
        pelanggaran++;
        document.getElementById('warning-box').style.display = "block";
        document.getElementById('warning-box').innerText = `Pelanggaran: ${pelanggaran}/3`;
        if (pelanggaran >= 3) {
            alert("BLOKIR OTOMATIS!");
            await fetch(URL_CLOUD, { method: 'POST', body: JSON.stringify({ type: "BLOKIR", user: currentUser.user }) });
            location.reload();
        } else {
            setTimeout(() => { alert("JANGAN PINDAH TAB!"); isWarningActive = false; }, 200);
        }
    };
}

async function confirmSubmit() {
    if(!confirm("Kirim jawaban?")) return;
    let benar = 0;
    bankSoal.forEach((s, i) => { if (s.tipe === "PG" && jawabanSiswa[i] === s.kunci) benar++; });
    let skor = (benar / bankSoal.filter(x => x.tipe === "PG").length * 100).toFixed(2);
    
    await fetch(URL_CLOUD, {
        method: 'POST',
        body: JSON.stringify({ type: "SUBMIT", nama: currentUser.nama, skor: skor, waktu: new Date().toLocaleString(), jawaban: JSON.stringify(jawabanSiswa) })
    });
    alert("Berhasil dikirim! Skor: " + skor);
    location.reload();
}

