import { photoLoading } from '../../script-backend/utils/loading_utils.js';

export const initPhotoUpload = (() => {
  // State management
  let uploadAbortController = null;
  let currentLoadingId = null;

  // DOM Elements cache
  const elements = {
    uploadButton: null,
    photoOverlay: null,
    cancelButton: null,
    previewImage: null,
    previewText: null,
    inputFile: null,
    form: null,
    progressBar: null,
    errorElement: null,
    successElement: null
  };

  // Configuration
  const config = {
    maxFileSize: 2 * 1024 * 1024, // 2MB
    minDimension: 200, // 200px
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    endpoint: '/api/auth/profile/upload'
  };

  // Initialize the module
  const init = () => {
    cacheDOMElements();
    setupEventListeners();
  };

  // Cache DOM elements for better performance
  const cacheDOMElements = () => {
    elements.uploadButton = document.querySelector('.gfot');
    elements.photoOverlay = document.getElementById('photo-overlay');
    elements.cancelButton = document.getElementById('cancel-photo-change');
    elements.previewImage = document.getElementById('preview-image-change');
    elements.previewText = document.getElementById('preview-text');
    elements.inputFile = document.getElementById('new-profile-photo');
    elements.form = document.getElementById('photo-upload-form');
    elements.progressBar = document.getElementById('upload-progress-bar');
    elements.errorElement = document.getElementById('upload-error-message');
    elements.successElement = document.getElementById('upload-success-message');
  };

  // Setup all event listeners
  const setupEventListeners = () => {
    elements.uploadButton?.addEventListener('click', showPhotoOverlay);
    elements.cancelButton?.addEventListener('click', resetPhotoUpload);
    elements.inputFile?.addEventListener('change', handleFileSelect);
    elements.form?.addEventListener('submit', handlePhotoUpload);
  };

  // Show the photo overlay modal
  const showPhotoOverlay = () => {
    elements.photoOverlay.style.display = 'block';
  };

  // Reset the upload form
  const resetPhotoUpload = () => {
    if (uploadAbortController) {
      uploadAbortController.abort();
      uploadAbortController = null;
    }

    if (currentLoadingId) {
      photoLoading.hide(currentLoadingId);
      photoLoading.destroy(currentLoadingId);
      currentLoadingId = null;
    }

    elements.photoOverlay.style.display = 'none';
    elements.inputFile.value = '';
    elements.previewImage.src = '';
    elements.previewText.textContent = 'Tidak ada gambar terpilih';
    updateProgressBar(0);
    hideMessages();
  };

  // Handle file selection and preview
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      resetPreview();
      return;
    }

    // Quick validation before showing preview
    if (!config.allowedTypes.includes(file.type)) {
      showErrorMessage('Format file tidak didukung. Gunakan JPEG, PNG, atau WEBP.');
      event.target.value = '';
      return;
    }

    elements.previewText.textContent = file.name;
    await displayImagePreview(file);
  };

  // Reset the preview area
  const resetPreview = () => {
    elements.previewImage.src = '';
    elements.previewText.textContent = 'Tidak ada gambar terpilih';
  };

  // Display image preview
  const displayImagePreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        elements.previewImage.src = e.target.result;
        resolve();
      };
      reader.onerror = () => {
        showErrorMessage('Gagal memuat preview gambar');
        resetPreview();
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle photo upload form submission
  const handlePhotoUpload = async (event) => {
    event.preventDefault();
    hideMessages();

    const file = elements.inputFile.files[0];
    
    if (!await validatePhotoFile(file)) {
      return;
    }

    try {
      currentLoadingId = photoLoading.create(elements.photoOverlay);
      photoLoading.show(currentLoadingId);

      uploadAbortController = new AbortController();
      await uploadWithProgress(file, uploadAbortController.signal);

      showSuccessMessage('Foto profil berhasil diperbarui!');
      resetPhotoUpload();
      refreshProfilePhotos();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Upload error:', error);
        showErrorMessage(`Gagal mengupload: ${error.message}`);
      }
    } finally {
      if (currentLoadingId) {
        photoLoading.hide(currentLoadingId);
        setTimeout(() => {
          photoLoading.destroy(currentLoadingId);
          currentLoadingId = null;
        }, 500);
      }
    }
  };

  // Validate the photo file
  const validatePhotoFile = async (file) => {
    if (!file) {
      showErrorMessage('Pilih gambar terlebih dahulu.');
      return false;
    }

    if (!config.allowedTypes.includes(file.type)) {
      showErrorMessage('Hanya format JPEG, PNG, atau WEBP yang diperbolehkan.');
      return false;
    }

    if (file.size > config.maxFileSize) {
      showErrorMessage(`Ukuran file maksimal ${config.maxFileSize/1024/1024}MB.`);
      return false;
    }

    try {
      const dimensions = await getImageDimensions(file);
      if (dimensions.width < config.minDimension || dimensions.height < config.minDimension) {
        showErrorMessage(`Resolusi gambar minimal ${config.minDimension}x${config.minDimension} piksel.`);
        return false;
      }
      if (Math.abs(dimensions.width - dimensions.height) > 10) {
        showErrorMessage('Gambar harus berbentuk persegi (rasio 1:1).');
        return false;
      }
    } catch (error) {
      showErrorMessage('Gagal memvalidasi gambar.');
      return false;
    }

    return true;
  };

  // Get image dimensions
  const getImageDimensions = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Upload with progress tracking
  const uploadWithProgress = (file, signal) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('fotoprofil', file);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          updateProgressBar(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.response));
          } catch (e) {
            resolve(xhr.response);
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.response);
            reject(new Error(errorData.message || xhr.statusText));
          } catch {
            reject(new Error(xhr.statusText || 'Upload failed'));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error. Periksa koneksi internet Anda.'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload dibatalkan'));
      });

      xhr.open('POST', config.endpoint);
      
      if (signal) {
        signal.addEventListener('abort', () => xhr.abort());
      }

      xhr.send(formData);
    });
  };

  // Update progress bar
  const updateProgressBar = (percent) => {
    if (elements.progressBar) {
      elements.progressBar.style.width = `${percent}%`;
      elements.progressBar.textContent = percent === 100 ? 'Menyelesaikan...' : `${percent}%`;
      
      if (percent >= 100) {
        setTimeout(() => {
          elements.progressBar.style.width = '0%';
          elements.progressBar.textContent = '';
        }, 1000);
      }
    }
  };

  // Refresh all profile photos on the page
  const refreshProfilePhotos = () => {
    const timestamp = new Date().getTime();
    document.querySelectorAll('.fotoprofil').forEach(img => {
      const currentSrc = img.src.split('?')[0];
      img.src = `${currentSrc}?t=${timestamp}`;
    });
  };

  // Show error message
  const showErrorMessage = (message) => {
    if (elements.errorElement) {
      elements.errorElement.textContent = message;
      elements.errorElement.style.display = 'block';
      setTimeout(() => elements.errorElement.style.display = 'none', 5000);
    } else {
      alert(message);
    }
  };

  // Show success message
  const showSuccessMessage = (message) => {
    if (elements.successElement) {
      elements.successElement.textContent = message;
      elements.successElement.style.display = 'block';
      setTimeout(() => elements.successElement.style.display = 'none', 3000);
    } else {
      alert(message);
    }
  };

  // Hide all messages
  const hideMessages = () => {
    if (elements.errorElement) elements.errorElement.style.display = 'none';
    if (elements.successElement) elements.successElement.style.display = 'none';
  };

  // Public API
  return {
    init,
    resetPhotoUpload,
    updateConfig: (newConfig) => {
      Object.assign(config, newConfig);
    }
  };
})();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initPhotoUpload.init);