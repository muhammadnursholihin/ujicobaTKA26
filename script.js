const URL_CLOUD = "https://script.google.com/macros/s/AKfycbxGxfbTjntudHauWSjJXkcQKVkimlCicQigUmqfOKS_aOajSjWUpFy1fYKW0euCbBkoUg/exec"; 
const TOKEN_UJIAN = "TKA26"; 

let bankSoal = [], cloudSiswa = [], currentUser = null;
let pelanggaran = 0, isWarningActive = false, jawabanSiswa = {};

// Sinkronisasi data saat startup
window.onload = async () => {
    try {
        const res = await fetch(URL_CLOUD);
        const data = await res.json();
        bankSoal = data.soal;
        cloudSiswa = data.siswa;
        document.getElementById('loader').style.display = "none";
    } catch (e) {
        console.error(e);
        alert("Gagal koneksi ke Cloud. Periksa URL_CLOUD!");
    }
};

async function prosesLogin() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    // Login Admin Default
    if (u === "admin" && p === "admin123") {
        currentUser = { nama: "Administrator", user: "admin" };
    } else {
        const user = cloudSiswa.find(s => s.user == u && s.pass == p);
        if (!user) return alert("User tidak ditemukan!");
        if (user.blokir === "YA") return alert("AKUN ANDA DIBLOKIR!");
        currentUser = { nama: user.nama, user: u };
    }

    document.getElementById('user-display').innerText = currentUser.nama;
    document.getElementById('login-overlay').style.display = "none";
    document.getElementById('main-dashboard').style.display = "flex";
}

function startUjian() {
    const t = prompt("Masukkan Token:");
    if (t !== TOKEN_UJIAN) return alert("Token Salah!");

    document.getElementById('welcome-screen').style.display = "none";
    document.getElementById('ujian-screen').style.display = "block";
    renderSoal();
    aktifkanAntiCheat();
}

function aktifkanAntiCheat() {
    window.onblur = async () => {
        // Jika sedang muncul alert, jangan deteksi sebagai pelanggaran baru
        if (isWarningActive || !currentUser || currentUser.user === "admin") return;

        isWarningActive = true; 
        pelanggaran++;
        document.getElementById('warning-box').style.display = "block";
        document.getElementById('warning-box').innerText = `Pelanggaran: ${pelanggaran}/3`;

        if (pelanggaran >= 3) {
            alert("SISTEM BLOKIR: Batas pelanggaran habis!");
            await fetch(URL_CLOUD, { method: 'POST', body: JSON.stringify({ type: "BLOKIR", user: currentUser.user }) });
            location.reload();
        } else {
            // Beri jeda sedikit agar browser tidak loop alert
            setTimeout(() => {
                alert(`DILARANG PINDAH TAB!\nPelanggaran: ${pelanggaran}/3`);
                isWarningActive = false; // Reset setelah klik Oke
            }, 200);
        }
    };
}

function renderSoal() {
    let html = "";
    bankSoal.forEach((s, i) => {
        html += `<div class="card"><strong>${i+1}. ${s.tanya}</strong><br>`;
        if (s.tipe === "PG") {
            ["A","B","C","D"].forEach(o => {
                html += `<label class="opsi-item"><input type="radio" name="q${i}" onchange="jawabanSiswa[${i}]='${o}'"> ${o}. ${s[o]}</label>`;
            });
        } else {
            html += `<textarea onkeyup="jawabanSiswa[${i}]=this.value" style="width:100%; height:60px; margin-top:10px;"></textarea>`;
        }
        html += `</div>`;
    });
    document.getElementById('render-soal').innerHTML = html;
}

async function confirmSubmit() {
    if (confirm("Kirim jawaban sekarang?")) {
        document.getElementById('loader').style.display = "flex";
        await kirimJawaban();
    }
}

async function kirimJawaban() {
    window.onblur = null; // Matikan deteksi saat kirim
    let benar = 0;
    bankSoal.forEach((s, i) => { if (s.tipe === "PG" && jawabanSiswa[i] === s.kunci) benar++; });
    let skor = (benar / bankSoal.filter(x => x.tipe === "PG").length * 100).toFixed(2);

    await fetch(URL_CLOUD, {
        method: 'POST',
        body: JSON.stringify({ 
            type: "SUBMIT", 
            nama: currentUser.nama, 
            skor: skor, 
            waktu: new Date().toLocaleString(), 
            jawaban: JSON.stringify(jawabanSiswa) 
        })
    });
    alert("Ujian Selesai! Skor Anda: " + skor);
    location.reload();
}