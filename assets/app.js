/* Bantuan kecil di browser. Validasi utama tetap di PHP + database. */

// Kolom angka dengan batas digit, contoh: <input data-digits="16"> untuk NIK.
// Huruf otomatis dibuang, dan penghitung "12/16" tampil di atas kolom.
document.querySelectorAll('input[data-digits]').forEach(function (el) {
  var max = parseInt(el.dataset.digits, 10);
  el.setAttribute('maxlength', max);
  el.setAttribute('inputmode', 'numeric');
  var label = el.closest('.field') && el.closest('.field').querySelector('label');
  var c = document.createElement('span');
  c.className = 'counter';
  if (label) label.appendChild(c);
  function upd() {
    el.value = el.value.replace(/\D/g, '').slice(0, max);
    c.textContent = el.value.length + '/' + max;
    c.className = 'counter ' + (el.value.length === max ? 'ok' : (el.value.length ? 'bad' : ''));
  }
  el.addEventListener('input', upd);
  upd();
});

// Nomor HP: hanya angka dan tanda + di depan.
document.querySelectorAll('input[data-hp]').forEach(function (el) {
  el.setAttribute('maxlength', 14);
  el.addEventListener('input', function () {
    el.value = el.value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  });
});

// Tombol pembuka <dialog>: <button data-open="idDialog">
document.querySelectorAll('[data-open]').forEach(function (b) {
  b.addEventListener('click', function () {
    var d = document.getElementById(b.dataset.open);
    if (d) d.showModal();
  });
});
document.querySelectorAll('[data-close]').forEach(function (b) {
  b.addEventListener('click', function () { b.closest('dialog').close(); });
});

// Pencarian cepat di tabel: <input data-filter="idTabel">
document.querySelectorAll('input[data-filter]').forEach(function (inp) {
  inp.addEventListener('input', function () {
    var q = inp.value.toLowerCase();
    document.querySelectorAll('#' + inp.dataset.filter + ' tbody tr').forEach(function (tr) {
      tr.style.display = tr.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none';
    });
  });
});

// =====================================================================
// VALIDASI INLINE sebelum data dikirim (Panduan UI SIMRS B.4 / Nielsen H5 / Shneiderman GR5).
// Server (PHP) + database tetap memvalidasi ulang; ini mencegah error sejak awal.
// =====================================================================
function labelOf(el) {
  var f = el.closest('.field'), l = f && f.querySelector('label');
  var t = l ? l.cloneNode(true) : null;
  if (t) { t.querySelectorAll('.counter,.req,.muted').forEach(function (x) { x.remove(); }); t = t.textContent; }
  t = (t || el.getAttribute('aria-label') || el.placeholder || el.name || 'Kolom').replace(/\*/g, '').replace(/\(.*?\)/g, '').trim();
  return t;
}
function cekField(el) {
  if (el.disabled || el.type === 'hidden' || el.readOnly && el.type !== 'checkbox') return null;
  var v = (el.value || '').trim(), L = labelOf(el), n = el.name || '';
  if (el.type === 'checkbox') return el.required && !el.checked ? 'Centang "' + L + '" untuk melanjutkan.' : null;
  if (el.type === 'radio') {
    var grup = el.form ? el.form.querySelectorAll('input[type=radio][name="' + el.name + '"]') : [el];
    var wajib = Array.prototype.some.call(grup, function (r) { return r.required; }), ada = Array.prototype.some.call(grup, function (r) { return r.checked; });
    return wajib && !ada ? (el.name === 'jam' ? 'Pilih jam kunjungan.' : 'Pilih salah satu pilihan.') : null;
  }
  if (el.required && v === '') return L + ' wajib diisi.';
  if (v === '') return null;
  var d = parseInt(el.dataset.digits || '0', 10);
  if (d && !/^\d+$/.test(v)) return L + ' hanya boleh berisi angka.';
  if (d && v.length !== d) return L + ' harus ' + d + ' digit angka (sekarang ' + v.length + ' digit).';
  if (el.hasAttribute('data-hp') && !/^(08|\+628|628)[0-9]{8,11}$/.test(v)) return 'Nomor HP harus diawali 08 / 628 / +628 dan berisi 10–15 digit angka, contoh 081234567890.';
  if (n === 'kode_icd10' && !/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/.test(v.toUpperCase())) return 'Kode ICD-10 tidak valid. Format: huruf + 2 angka (+ desimal), contoh J18.9 atau I10.';
  if (n === 'nomor_rm' && !/^RM-\d{4}-\d{6}$/i.test(v)) return 'Format No. RM: RM-2026-000123.';
  if (n === 'tekanan_darah') {
    var m = v.match(/^(\d{2,3})\/(\d{2,3})$/);
    if (!m) return 'Tekanan darah ditulis sistolik/diastolik, contoh 120/80.';
    if (+m[1] <= +m[2]) return 'Sistolik harus lebih besar dari diastolik (contoh 120/80).';
  }
  if (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return L + ' harus berupa alamat email yang valid.';
  if (el.type === 'number') {
    var x = Number(v.replace(',', '.'));
    if (isNaN(x)) return L + ' harus berupa angka.';
    if (el.min !== '' && x < Number(el.min)) return L + ' minimal ' + el.min + '.';
    if (el.max !== '' && x > Number(el.max)) return L + ' maksimal ' + el.max + '.';
  }
  if (el.type === 'date') {
    if (el.max && v > el.max) return /lahir/i.test(n + L) ? 'Tanggal lahir tidak boleh di masa depan.' : L + ' tidak boleh melewati ' + el.max.split('-').reverse().join('-') + '.';
    if (el.min && v < el.min) return L + ' tidak boleh sebelum ' + el.min.split('-').reverse().join('-') + '.';
  }
  if (el.minLength > 0 && v.length < el.minLength) return L + ' minimal ' + el.minLength + ' karakter.';
  if (el.pattern && !new RegExp('^(?:' + el.pattern + ')$').test(v)) return el.dataset.pesan || 'Format ' + L + ' tidak sesuai.';
  return null;
}
function tampilErr(el, msg) {
  var host = el.closest('.field') || el.parentNode, old = host.querySelector('.js-err');
  if (el.type === 'radio') { if (old) old.remove(); if (msg) { var q = document.createElement('p'); q.className = 'field-error js-err'; q.textContent = msg; host.appendChild(q); } return; }
  if (old) old.remove();
  el.classList.toggle('is-invalid', !!msg);
  el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (msg) { var p = document.createElement('p'); p.className = 'field-error js-err'; p.textContent = msg; host.appendChild(p); }
}
function validasiForm(f) {
  var first = null;
  f.querySelectorAll('input, select, textarea').forEach(function (el) {
    if (el.closest('[hidden]') || (el.offsetParent === null && el.type !== 'checkbox' && el.type !== 'radio' && !el.closest('dialog[open]'))) return;
    if (el.type === 'radio') { if (el.disabled || el !== f.querySelector('input[type=radio][name="' + el.name + '"]:not([disabled])')) return; }
    var msg = cekField(el);
    tampilErr(el, msg);
    if (msg && !first) first = el;
  });
  if (first) { first.focus(); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  return !first;
}
document.addEventListener('blur', function (e) {
  var el = e.target;
  if (el.form && /INPUT|SELECT|TEXTAREA/.test(el.tagName) && (el.value || el.classList.contains('is-invalid'))) tampilErr(el, cekField(el));
}, true);
document.addEventListener('input', function (e) {
  if (e.target.classList && e.target.classList.contains('is-invalid')) tampilErr(e.target, cekField(e.target));
}, true);

// =====================================================================
// KONFIRMASI AKSI MERUSAK lewat modal (bukan alert browser) — Panduan B.4.2
// <form data-confirm="Hapus pasien ini?"> atau <a data-confirm-link="Keluar?">
// =====================================================================
function konfirmasi(pesan, lanjut) {
  var d = document.getElementById('dlgKonfirmasi');
  if (!d) {
    d = document.createElement('dialog'); d.id = 'dlgKonfirmasi'; d.className = 'modal'; d.style.width = 'min(440px, calc(100vw - 24px))';
    d.innerHTML = '<div class="modal-head"><h3>Konfirmasi</h3></div><div class="modal-body"><p id="dlgPesan" style="font-size:14px"></p></div>'
      + '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-tidak>Batal</button><button type="button" class="btn btn-danger" data-ya>Ya, lanjutkan</button></div>';
    document.body.appendChild(d);
    d.querySelector('[data-tidak]').onclick = function () { d.close(); };
  }
  d.querySelector('#dlgPesan').textContent = pesan;
  d.querySelector('[data-ya]').onclick = function () { d.close(); lanjut(); };
  d.showModal();
}
document.querySelectorAll('a[data-confirm-link]').forEach(function (a) {
  a.addEventListener('click', function (e) { e.preventDefault(); konfirmasi(a.dataset.confirmLink, function () { location.href = a.href; }); });
});

// Pesan validasi bawaan browser diganti pesan berbahasa Indonesia yang spesifik di bawah kolom
document.querySelectorAll('form').forEach(function (f) { f.noValidate = true; });

// Alur kirim form: validasi -> (konfirmasi) -> status loading pada tombol (cegah klik ganda)
document.addEventListener('submit', function (e) {
  var f = e.target, btn = e.submitter;
  if (f.dataset.skipValidasi) return;
  if (!validasiForm(f)) { e.preventDefault(); return; }
  if (f.dataset.confirm && !f.dataset.terkonfirmasi) {
    e.preventDefault();
    konfirmasi(f.dataset.confirm, function () { f.dataset.terkonfirmasi = '1'; if (f.requestSubmit) f.requestSubmit(btn || undefined); else f.submit(); });
    return;
  }
  if ((f.method || '').toLowerCase() === 'post' && btn) {
    if (btn.name) { var h = document.createElement('input'); h.type = 'hidden'; h.name = btn.name; h.value = btn.value; f.appendChild(h); btn.removeAttribute('name'); }
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    if (btn.textContent.trim().length < 40) btn.dataset.label = btn.textContent;
  }
});

// Toast hilang otomatis setelah 6 detik (umpan balik instan, Nielsen H1)
document.querySelectorAll('.toast').forEach(function (t) { setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 6000); });

// Font monospace untuk data terstruktur: No. RM, kode transaksi, kode ICD-10, nomor antrean, jam (Panduan B.2.2)
(function () {
  var root = document.querySelector('.content') || document.body, re = /\b(RM-\d{4}-\d{6}|[A-Z]{2,4}-\d{4}-\d{6}|[A-Z]{2,4}-\d{3,6}|[A-Z]-\d{3}|[A-Z]\d{2}\.\d{1,2}|\d{2}:\d{2})\b/g;
  var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
    var p = n.parentNode;
    if (!p || /^(SCRIPT|STYLE|TEXTAREA|OPTION|SELECT|TITLE|BUTTON)$/.test(p.nodeName) || p.closest('.mono, .data-mono, button, .btn, .badge')) return NodeFilter.FILTER_REJECT;
    re.lastIndex = 0; return re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
  } }), nodes = [];
  while (w.nextNode() && nodes.length < 4000) nodes.push(w.currentNode);
  nodes.forEach(function (n) {
    var frag = document.createDocumentFragment(), txt = n.nodeValue, last = 0;
    txt.replace(re, function (m, g, i) {
      frag.appendChild(document.createTextNode(txt.slice(last, i)));
      var s = document.createElement('span'); s.className = 'data-mono'; s.textContent = m; frag.appendChild(s); last = i + m.length;
    });
    frag.appendChild(document.createTextNode(txt.slice(last)));
    n.parentNode.replaceChild(frag, n);
  });
})();

// Pintasan keyboard: "/" untuk langsung ke kolom pencarian (Nielsen H7)
document.addEventListener('keydown', function (e) {
  if (e.key !== '/' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  var s = document.querySelector('.content input[name=q], .content input[name=cari], .content input[data-filter]');
  if (s) { e.preventDefault(); s.focus(); }
});

// =====================================================================
// PILIHAN JAM JANJI TEMU: jam yang tersedia langsung tampil setelah dokter & tanggal dipilih
// <div data-slot-picker data-url=".../jadwal/slot.php" data-dokter="#idSelect" data-tanggal="#idTanggal" data-terpilih="08:15">
// =====================================================================
document.querySelectorAll('[data-slot-picker]').forEach(function (box) {
  var dok = document.querySelector(box.dataset.dokter), tgl = document.querySelector(box.dataset.tanggal);
  var terpilih = box.dataset.terpilih || '';
  function tulis(html) { box.innerHTML = html; }
  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  function muat() {
    if (!dok.value || !tgl.value) { tulis('<p class="slot-msg">Pilih dokter dan tanggal untuk melihat jam yang tersedia.</p>'); return; }
    tulis('<p class="slot-msg">Memuat jam praktik…</p>');
    fetch(box.dataset.url + '?dokter=' + encodeURIComponent(dok.value) + '&tanggal=' + encodeURIComponent(tgl.value) + (box.dataset.kecuali ? '&kecuali=' + box.dataset.kecuali : ''), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var h = '';
        if (d.info) h += '<p class="slot-info">' + esc(d.info) + '</p>';
        var lsg = box.dataset.tanpaJam;
        if (lsg && !(d.slot && d.slot.length) && d.info) {   // pendaftaran langsung: tetap bisa antrean tanpa jam
          h += '<div class="slot-grid"><label class="slot slot-wide"><input type="radio" name="jam" value="" checked><span>' + esc(lsg) + '</span></label></div>';
        }
        if (d.slot && d.slot.length) {
          h += '<div class="slot-grid" role="radiogroup" aria-label="Pilih jam">';
          if (box.dataset.tanpaJam) h += '<label class="slot slot-wide"><input type="radio" name="jam" value=""' + (terpilih === '' ? ' checked' : '') + '><span>' + esc(box.dataset.tanpaJam) + '</span></label>';
          d.slot.forEach(function (s) {
            var ada = s.status === 'Tersedia';
            h += '<label class="slot' + (ada ? '' : ' slot-full') + '"' + (ada ? '' : ' title="Sudah dipilih pasien lain"') + '><input type="radio" name="jam" value="' + s.jam + '"' + (ada ? (box.dataset.tanpaJam ? '' : ' required') : ' disabled') + (s.jam === terpilih && ada ? ' checked' : '') + '><span>' + s.jam + (ada ? '' : '<small>Terisi</small>') + '</span></label>';
          });
          h += '</div><p class="slot-legend"><span class="slot-dot"></span> tersedia &nbsp; <span class="slot-dot slot-dot-full"></span> terisi (sudah dipilih pasien lain)</p>';
        }
        if (d.pesan) h += '<div class="alert alert-warning mt-2 mb-0">' + esc(d.pesan) + '</div>';
        if (lsg && d.pesan) h = h.replace(esc(d.pesan), esc(d.pesan.replace(/ Pilih tanggal lain\.$/, '')) + ' Pasien tetap dapat didaftarkan dengan antrean langsung, atau buat appointment untuk hari lain.');
        if (d.tanggal_lain && d.tanggal_lain.length && !box.hasAttribute('data-tanpa-saran')) {
          h += '<p class="slot-info mt-2">Tanggal terdekat yang masih tersedia:</p><div class="flex flex-wrap gap-2">';
          d.tanggal_lain.forEach(function (t) { h += '<button type="button" class="btn btn-soft btn-sm" data-tgl="' + t.tanggal + '">' + esc(t.label) + '</button>'; });
          h += '</div>';
        }
        tulis(h);
        box.querySelectorAll('[data-tgl]').forEach(function (b) { b.onclick = function () { tgl.value = b.dataset.tgl; tgl.dispatchEvent(new Event('change')); }; });
        box.querySelectorAll('input[name=jam]').forEach(function (r) { r.onchange = function () { terpilih = r.value; }; });
      })
      .catch(function () { tulis('<div class="alert alert-error mb-0">Jam praktik gagal dimuat. Muat ulang halaman.</div>'); });
  }
  dok.addEventListener('change', function () { terpilih = ''; muat(); });
  tgl.addEventListener('change', muat);
  muat();
});
