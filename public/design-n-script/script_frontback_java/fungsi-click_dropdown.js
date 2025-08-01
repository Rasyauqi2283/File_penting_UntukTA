function bukaDropdown(id) {
  const konten = document.getElementById(id);
  const tanda = konten.previousElementSibling.querySelector('.tanda'); 
  konten.classList.toggle('active');
  tanda.textContent = konten.classList.contains('active') ? '-' : '+';
}
function toggleForm() {
  const form = document.getElementById('formBadanUsaha_Bphtb');
  form.classList.toggle('visible');
  
  // Ganti teks tombol jika perlu
  const btn = document.querySelector('.btn-action.tambah');
  if (form.classList.contains('visible')) {
    btn.textContent = 'Tutup Form';
  } else {
    btn.textContent = 'Tambah';
  }
}
///////////////////////////////////////////////
///     upload tanda tangan     ////////////////
///////////////////////////////////////////////
  document.getElementById('cancelUploadBtn').addEventListener('click', function() {
    document.getElementById('overlay-sign').style.display = 'none';
    resetSignatureForm();
  });
