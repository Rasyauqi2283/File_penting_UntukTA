// catatan (belum beres pada bagian ini)
// ==== 1. Imports and Dependencies ====
import { api } from '../../script-backend/utils/api_utils.js';
import { photoLoading  } from '../../script-backend/utils/loading_utils.js';
import { initPhotoUpload } from './uploadfoto_profile.js';
import { initPasswordChange } from './passwordchange_profile.js';
import { initSignatureUpload } from './ttdverif_profile.js';

// ==== 2. Profile API Service ====
class ProfileService {
  static async getProfile(abortSignal) {
    const response = await api.get('/api/auth/profile', { signal: abortSignal });
    if (!response?.user?.id) throw new Error('Invalid profile data from server');
    return response;
  }

  static async uploadPhoto(formData, abortSignal) {
    return api.post('/api/auth/profile/upload', formData, {
      signal: abortSignal,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  static async updatePassword({ oldPassword, newPassword }) {
    return api.post('/api/auth/update-password', { oldPassword, newPassword });
  }

  static async uploadSignature(formData) {
    return api.post('/api/auth/update-profile-paraf', formData);
  }
}

// ==== 3. Main Profile Controller ====
export class ProfileController {
  constructor() {
    this.initProperties();
    this.initElements();
    this.bindEvents();
    this.setupUnloadHandler();
  }

  // ==== 3.1 Initialization Methods ====
  initProperties() {
    this.profileData = null;
    this.abortController = new AbortController();
    this.divisiToHide = ['PPAT', 'PPATS', 'Wajib Pajak'];
    this.cleanupCallbacks = [];
    this.loadingIds = new Map();
    this.elements = {};
    this.isUpdating = false;
    this.isDevelopment = true; // Define the missing variable
  }

  initElements() {
    const getElement = (id) => {
      const el = document.getElementById(id);
      if (!el) console.warn(`Element #${id} not found`);
      return el;
    };

    this.elements = {
      profileContainer: getElement('profile-container'),
      photoUploadForm: getElement('upload-form'),
      nipField: getElement('nip-field'),
      specialField: getElement('special_field'),
      specialFieldInput: getElement('special_field_input'),
      specialParafv: getElement('special_ParafValidasi'),
      profileImg: document.getElementById('profileImg'),
      profilePictureWrapper: document.querySelector('.profile-picture-wrapper'),
      ttdPreview: document.getElementById('ttd-preview'),
      ttdInfo: document.getElementById('ttd-info'),
      errorDisplay: document.getElementById('profile-error-message')
    };
  }

  bindEvents() {
    this.loadProfile();
    if (this.elements.photoUploadForm) {
      this.elements.photoUploadForm.addEventListener('submit', (e) => this.handlePhotoUpload(e));
    }
    this.initPasswordToggles();
  }

  setupUnloadHandler() {
    this.unloadHandler = this.cleanup.bind(this);
    window.addEventListener('beforeunload', this.unloadHandler);
    this.addCleanup(() => {
      window.removeEventListener('beforeunload', this.unloadHandler);
    });
  }

  // ==== 3.2 Core Profile Methods ====
  prepareRequest() {
    // Abort any existing request
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
  }

  async loadProfile() {
    let loadingId;
    try {
        this.prepareRequest();
        loadingId = this.showProfileLoading();
        
        if (this.isDevelopment) {
        console.log('Loading profile data...');
        }
        
        this.profileData = await ProfileService.getProfile(this.abortController.signal);
        
        if (this.isDevelopment) {
        console.log('Profile data received:', this.profileData);
        }
        
        this.handleProfileData();
        this.hideLoading(loadingId);
    } catch (error) {
        this.handleProfileError(error);
        this.hideLoading(loadingId);
    } finally {
        if (loadingId) this.cleanupLoading(loadingId);
        this.currentTimeout = null;
    }
    }

  // ==== 3.3 Profile Update Handler ====
  async handleProfileUpdate(updateFn) {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    const loadingId = photoLoading.create(this.elements.profileContainer);
    
    try {
      this.loadingIds.set(loadingId, { element: this.elements.profileContainer });
      photoLoading.show(loadingId);
      await updateFn();
      await this.loadProfile();
    } catch (error) {
      console.error('Update error:', error);
      this.showError(error.message || 'Gagal menyimpan perubahan');
    } finally {
      this.cleanupLoading(loadingId);
      this.isUpdating = false;
    }
  }

  // ==== 3.4 Utility Methods ====
  getUserDivisi() {
    return localStorage.getItem('divisi') || this.profileData?.user?.divisi;
  }

  cleanup() {
    this.cleanupCallbacks.forEach(cb => cb());
    this.cleanupCallbacks = [];
  }

  addCleanup(callback) {
    this.cleanupCallbacks.push(callback);
  }

  showError(message) {
    if (this.elements.errorDisplay) {
      this.elements.errorDisplay.textContent = message;
      this.elements.errorDisplay.style.display = 'block';
    }
  }

  hideError() {
    if (this.elements.errorDisplay) {
      this.elements.errorDisplay.textContent = '';
      this.elements.errorDisplay.style.display = 'none';
    }
  }

  // ==== 3.5 Loading Management ====
  showProfileLoading() {
    if (!this.elements.profileContainer) {
      throw new Error('Profile container not found');
    }

    const loadingId = photoLoading.create(this.elements.profileContainer);
    this.loadingIds.set(loadingId, { element: this.elements.profileContainer });
    photoLoading.show(loadingId);
    
    this.currentTimeout = setTimeout(() => {
      if (this.loadingIds.has(loadingId)) {
        photoLoading.hide(loadingId);
        this.showError('Request terlalu lama, silakan coba lagi');
      }
    }, 30000);
    
    return loadingId;
  }

  hideLoading(loadingId) {
    if (loadingId && this.loadingIds.has(loadingId)) {
      photoLoading.hide(loadingId);
      photoLoading.destroy(loadingId);
      this.loadingIds.delete(loadingId);
    }
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
  }

  cleanupLoading(loadingId) {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    
    if (loadingId && this.loadingIds.has(loadingId)) {
      try {
        photoLoading.hide(loadingId);
        photoLoading.destroy(loadingId);
        this.loadingIds.delete(loadingId);
      } catch (error) {
        console.warn('Error during loading cleanup:', error);
      }
    }
  }

  // ==== 3.6 Profile Rendering ====
  handleProfileData() {
    if (this.isDevelopment) {
      console.log('Profile data:', this.profileData);
    }
    
    this.renderProfile();
    this.initSubModules();
  }

  renderProfile() {
    if (!this.profileData || !this.validateProfileData(this.profileData)) {
      this.showError('Data profil tidak valid');
      return;
    }

    const userData = this.profileData;
    const cacheBuster = `?t=${new Date().getTime()}`;
    
    this.handleDivisiSpecificFields(userData);
    this.updateUserDataFields(userData);
    this.updateProfilePhoto(userData, cacheBuster);
    this.handleSignature(userData, cacheBuster);
    this.hideError();
  }

  validateProfileData(userData) {
    if (!userData) return false;
    
    const mandatoryFields = ['userid', 'nama', 'divisi', 'email'];
    for (const field of mandatoryFields) {
      if (userData[field] === undefined || userData[field] === null) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    const divisi = userData.divisi;
    const divisiRequirements = {
      'PPAT': ['special_field'],
      'PPATS': ['special_field'],
      'Peneliti Validasi': ['special_parafv']
    };

    const requiredFields = divisiRequirements[divisi] || [];
    for (const field of requiredFields) {
      if (userData[field] === null || userData[field] === undefined) {
        console.warn(`Missing required field for ${divisi}: ${field}`);
        return false;
      }
    }

    return true;
  }

  handleDivisiSpecificFields(user) {
    const userDivisi = user.divisi;
    if (!userDivisi) return;

    // NIP Field
    if (this.elements.nipField && this.divisiToHide.includes(userDivisi)) {
      this.elements.nipField.style.display = "none";
    }
    
    // Special Field
    if (this.elements.specialField) {
      const shouldShowSpecialField = ['PPAT', 'PPATS'].includes(userDivisi);
      this.elements.specialField.style.display = shouldShowSpecialField ? "block" : "none";
      if (shouldShowSpecialField) {
        this.elements.specialFieldInput.value = user.special_field || '';
      }
    }
    
    // Special Paraf Validasi
    if (this.elements.specialParafv) {
      const shouldShowParaf = userDivisi === 'Peneliti Validasi';
      this.elements.specialParafv.style.display = shouldShowParaf ? "block" : "none";
      if (shouldShowParaf) {
        document.getElementById('special_parafv').value = user.special_parafv || '';
      }
    }
  }

  updateUserDataFields(user) {
    this.updateField('.userid', user.userid);
    this.updateField('.nama', user.nama);
    this.updateField('.divisi', user.divisi);
    this.updateField('#email', user.email);
    this.updateField('#telepon', user.telepon);
    this.updateField('#username', user.username);
    this.updateField('#password', user.password);
    this.updateField('#nip', user.nip || '-');
    this.updateField('#special_field_input', user.special_field || 'Divisi Tidak Sesuai');
    this.updateField('#special_parafv', user.special_parafv || 'Divisi Tidak Sesuai');
  }

  updateField(selector, value) {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;
    const displayValue = value || 'Tidak tersedia';
    
    elements.forEach(element => {
      if (element.value !== undefined) element.value = displayValue;
      if (element.textContent !== undefined) element.textContent = displayValue;
    });
  }

  updateProfilePhoto(user, cacheBuster) {
    const defaultPhoto = '/default-foto-profile.png';
    let fotoProfilUrl = defaultPhoto;
    
    if (user.fotoprofil) {
      try {
        const cleanPath = user.fotoprofil.replace(/\\/g, '/');
        fotoProfilUrl = `${decodeURIComponent(cleanPath)}${cacheBuster}`;
      } catch (e) {
        console.error('Error processing photo URL:', e);
      }
    }
    
    document.querySelectorAll('.fotoprofil').forEach(img => {
      img.src = fotoProfilUrl;
      img.onerror = () => {
        if (img.src !== defaultPhoto) {
          img.src = defaultPhoto;
        }
      };
    });
  }

  handleSignature(user, cacheBuster) {
    if (!this.elements.ttdPreview || !this.elements.ttdInfo) return;
  
    if (user.tanda_tangan_path) {
      this.elements.ttdPreview.src = `${user.tanda_tangan_path}${cacheBuster}`;
      this.elements.ttdPreview.onerror = () => {
        this.elements.ttdPreview.src = '/default-signature.png';
      };
      this.elements.ttdInfo.textContent = `Tipe: ${user.tanda_tangan_mime || 'image/jpeg'}`;
    } else {
      this.elements.ttdPreview.src = '/default-signature.png';
      this.elements.ttdInfo.textContent = 'Tanda tangan belum diunggah';
    }
  }

  // ==== 3.7 Submodules Initialization ====
  initSubModules() {
    const modules = [
      { 
        name: 'Photo Upload', 
        init: () => initPhotoUpload(),
        shouldLoad: true
      },
      { 
        name: 'Password Change', 
        init: () => initPasswordChange(),
        shouldLoad: true
      },
      { 
        name: 'Signature Upload', 
        init: () => initSignatureUpload(),
        shouldLoad: this.shouldLoadSignatureModule()
      }
    ];

    modules.forEach(module => {
      if (!module.shouldLoad) return;
      
      try {
        module.init();
      } catch (err) {
        console.error(`${module.name} initialization failed:`, err);
        this.showError(`${module.name} feature unavailable`);
      }
    });
  }

  shouldLoadSignatureModule() {
    const userDivisi = this.getUserDivisi();
    return ['Peneliti', 'Peneliti Validasi', 'PPAT', 'PPATS'].includes(userDivisi);
  }

  // ==== 3.8 Photo Upload Handling ====
  validatePhotoInput(form) {
    const fileInput = form.querySelector('input[type="file"]');
    if (!fileInput || !fileInput.files[0]) {
      this.showError('Pilih file foto terlebih dahulu');
      return false;
    }

    const file = fileInput.files[0];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      this.showError('Format file tidak didukung. Gunakan JPG, JPEG, atau PNG');
      return false;
    }

    if (file.size > maxSize) {
      this.showError('Ukuran file terlalu besar. Maksimal 5MB');
      return false;
    }

    return true;
  }

  async uploadPhoto(form) {
    const formData = new FormData(form);
    return await ProfileService.uploadPhoto(formData, this.abortController.signal);
  }

  async handlePhotoUpload(event) {
    event.preventDefault();
    
    if (!this.validatePhotoInput(event.target)) return;
    
    const loadingId = this.showPhotoLoading();
    
    try {
        const result = await this.uploadPhoto(event.target);
        
        if (result?.success && result?.path) {
            this.updateProfilePhoto({ fotoprofil: result.path });
            this.showSuccess('Foto profil berhasil diupdate');
        } else {
            throw new Error('Invalid server response');
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            this.showError(error.message || 'Failed to upload photo');
            console.error('Upload error:', error);
        }
    } finally {
        this.hidePhotoLoading(loadingId);
    }
  }

  showPhotoLoading() {
    const loadingId = photoLoading.create(this.elements.profilePictureWrapper);
    this.loadingIds.set(loadingId, { element: this.elements.profilePictureWrapper });
    photoLoading.show(loadingId);
    return loadingId;
  }

  hidePhotoLoading(loadingId) {
    if (loadingId && this.loadingIds.has(loadingId)) {
      photoLoading.hide(loadingId);
      setTimeout(() => {
        photoLoading.destroy(loadingId);
        this.loadingIds.delete(loadingId);
      }, 300);
    }
  }

  showSuccess(message) {
    // Implement success message display logic
    console.log('Success:', message);
    // You can add a success notification here
    if (this.elements.errorDisplay) {
      this.elements.errorDisplay.textContent = message;
      this.elements.errorDisplay.style.display = 'block';
      this.elements.errorDisplay.style.color = 'green';
      setTimeout(() => {
        this.hideError();
      }, 3000);
    }
  }

  // ==== 3.9 Enhanced Error Handling ====
  handleProfileError(error) {
    // Define error message mappings
    const ERROR_MESSAGES = {
        default: 'Gagal memuat data profil',
        AbortError: { user: null, log: 'Request aborted' },
        network: 'Tidak ada respon dari server. Periksa koneksi internet Anda.',
        invalidData: 'Data profil tidak valid dari server',
        http: {
        401: 'Sesi telah berakhir. Silakan login kembali.',
        403: 'Anda tidak memiliki izin untuk mengakses profil ini',
        404: 'Profil tidak ditemukan',
        500: 'Terjadi kesalahan server'
        }
    };

    // Handle AbortError immediately
    if (error.name === 'AbortError') {
        console.warn('Profile loading aborted:', error);
        return;
    }

    // Determine the error type and message
    let userMessage = ERROR_MESSAGES.default;
    let shouldRedirect = false;
    let logDetails = error.message || 'Unknown error';

    if (error.response) {
        // HTTP Error responses
        const status = error.response.status;
        userMessage = ERROR_MESSAGES.http[status] || ERROR_MESSAGES.default;
        logDetails = `HTTP Error ${status}: ${error.response.data?.message || ''}`;
        shouldRedirect = status === 401;
    } else if (error.request) {
        // Network errors (no response received)
        userMessage = ERROR_MESSAGES.network;
        logDetails = 'No response received';
    } else if (error.message?.includes('Invalid profile data')) {
        // Custom service errors
        userMessage = ERROR_MESSAGES.invalidData;
    }

    // Enhanced error logging
    this.logError(error, logDetails);

    // Show error to user if message exists
    if (userMessage) {
        this.showError(userMessage);
    }

    // Handle critical actions (like redirects)
    if (shouldRedirect) {
        this.safeRedirectToLogin();
    }
  }

  // ==== Helper Methods ====
  logError(error, details) {
    if (this.isDevelopment) {
        console.groupCollapsed('[Profile] Error Details');
        console.error('Message:', details);
        console.error('Full Error:', error);
        if (error.response) {
        console.log('Response Data:', error.response.data);
        console.log('Status:', error.response.status);
        }
        console.groupEnd();
    } else {
        // In production, you might want to send this to an error tracking service
        console.error('[Profile Error]', details);
    }
  }

  safeRedirectToLogin() {
    // Clear any pending operations
    this.abortController?.abort();
    
    // Use a more robust redirect approach
    try {
        const redirectPath = encodeURIComponent(window.location.pathname + window.location.search);
        setTimeout(() => {
        window.location.replace(`/login?redirect=${redirectPath}`);
        }, 2000);
    } catch (e) {
        console.error('Redirect failed:', e);
        window.location.replace('/login');
    }
  }

  // ==== 3.10 Password Toggle Functionality ====
  initPasswordToggles() {
    const toggleSelectors = [
      '#toggle-password',
      '#toggle-old-password', 
      '#toggle-new-password',
      '#toggle-confirm-password'
    ];

    toggleSelectors.forEach(selector => {
      const toggleBtn = document.querySelector(selector);
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const input = toggleBtn.previousElementSibling;
          if (input && input.type === 'password') {
            input.type = 'text';
            toggleBtn.textContent = '🙈';
          } else if (input && input.type === 'text') {
            input.type = 'password';
            toggleBtn.textContent = '👁️';
          }
        });
      }
    });
  }
}

// ==== 4. Initialization ====
document.addEventListener('DOMContentLoaded', () => {
  new ProfileController();
});