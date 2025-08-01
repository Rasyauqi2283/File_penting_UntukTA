
let previewUrl = null;
let grayscaleUrl = null;

export const initSignatureUpload = () => {
  const userDivisi = localStorage.getItem('divisi') || sessionStorage.getItem('divisi');
  const allowedDivisi = ['Peneliti', 'Peneliti Validasi', 'PPAT', 'PPATS'];
  
  if (allowedDivisi.includes(userDivisi)) {
    document.getElementById('paraf-peneliti').style.display = 'block';
    setupSignatureModal();
  }
};

const setupSignatureModal = () => {
  const modal = document.getElementById('parafModal');
  const btn = document.getElementById('paraf-peneliti');
  const span = document.getElementsByClassName('close')[0];
  const fileInput = document.getElementById('parafImage');
  const form = document.getElementById('parafForm');

  btn.onclick = () => {
    resetSignatureForm();
    modal.style.display = 'block';
  };
  
  span.onclick = () => {
    resetSignatureForm();
    modal.style.display = 'none';
  };
  
  fileInput.addEventListener('change', handleSignaturePreview);
  form.addEventListener('submit', handleSignatureUpload);
};

const handleSignaturePreview = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Bersihkan URL sebelumnya
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  if (grayscaleUrl) URL.revokeObjectURL(grayscaleUrl);

  const preview = document.getElementById('parafPreview');
  const canvas = document.getElementById('grayscalePreview');
  const ctx = canvas.getContext('2d');

  // Validasi file
  if (!validateSignatureFile(file)) {
    e.target.value = '';
    return;
  }

  // Preview original
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  preview.style.display = 'block';

  // Create grayscale preview
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.filter = 'grayscale(100%)';
    ctx.drawImage(img, 0, 0);
    canvas.style.display = 'block';
  };
  grayscaleUrl = URL.createObjectURL(file);
  img.src = grayscaleUrl;
};

const handleSignatureUpload = async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('parafImage');
  const modal = document.getElementById('parafModal');
  
  if (!fileInput.files[0]) {
    showErrorMessage('Pilih file terlebih dahulu!');
    return;
  }

  // Validasi dimensi
  try {
    const isValid = await validateSignatureDimensions(fileInput.files[0]);
    if (!isValid) {
      showErrorMessage('Tanda tangan harus memiliki rasio lebar:tinggi > 2:1 dan maksimal 800x300px');
      return;
    }
  } catch (error) {
    showErrorMessage('Gagal memvalidasi gambar');
    return;
  }

  const loadingId = loading.create({
    target: modal,
    message: 'Mengupload tanda tangan...',
    type: 'bar'
  });

  try {
    loading.show(loadingId);
    
    const formData = new FormData();
    formData.append('signature', fileInput.files[0]);

    const response = await fetch('/api/auth/update-profile-paraf', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Upload Failed');
    
    if (result.success) {
      showSuccessMessage(result.message);
      if (result.data.path) {
        updateSignaturePreview(result.data.path);
      }
      resetSignatureForm();
      modal.style.display = 'none';
    }
  } catch (error) {
    console.error('Upload error:', error);
    showErrorMessage(`Gagal mengupload: ${error.message}`);
  } finally {
    loading.hide(loadingId);
    setTimeout(() => loading.destroy(loadingId), 500);
  }
};

const validateSignatureFile = (file) => {
  const errorElement = document.getElementById('signature-error-message');
  errorElement.textContent = '';
  errorElement.style.display = 'none';

  if (!file) {
    showErrorMessage('Pilih file terlebih dahulu!');
    return false;
  }

  // Validasi tipe file
  const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    showErrorMessage('Hanya format PNG, JPEG, atau SVG yang diperbolehkan');
    return false;
  }

  // Validasi ukuran file
  if (file.size > 1 * 1024 * 1024) { // 1MB
    showErrorMessage('Ukuran file maksimal 1MB');
    return false;
  }

  return true;
};

const validateSignatureDimensions = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const isValid = img.width <= 800 && img.height <= 300 && img.width / img.height > 2;
      URL.revokeObjectURL(img.src);
      resolve(isValid);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(false);
    };
    img.src = URL.createObjectURL(file);
  });
};

const updateSignaturePreview = (path) => {
  const timestamp = new Date().getTime();
  const preview = document.getElementById('ttd-preview');
  preview.src = `${path}?t=${timestamp}`;
};

const resetSignatureForm = () => {
  document.getElementById('parafForm').reset();
  document.getElementById('parafPreview').style.display = 'none';
  document.getElementById('grayscalePreview').style.display = 'none';
  document.getElementById('signature-error-message').style.display = 'none';
  
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  if (grayscaleUrl) URL.revokeObjectURL(grayscaleUrl);
  previewUrl = null;
  grayscaleUrl = null;
};

const showErrorMessage = (message) => {
  const errorElement = document.getElementById('signature-error-message');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const showSuccessMessage = (message) => {
  const successElement = document.getElementById('signature-success-message');
  successElement.textContent = message;
  successElement.style.display = 'block';
  
  setTimeout(() => {
    successElement.style.display = 'none';
  }, 3000);
};
