export const initPasswordChange = () => {
  const confirmPasswordChange = document.getElementById('confirm-password-change');
  confirmPasswordChange?.addEventListener('click', handlePasswordChange);
};

const handlePasswordChange = async () => {
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const passwordOverlay = document.getElementById('password-overlay');
  const button = document.getElementById('confirm-password-change');

  // Validasi
  if (!validatePasswords(newPassword, confirmPassword)) return;

  // UI Loading State
  button.disabled = true;
  button.textContent = 'Memproses...';

  try {
    const success = await updatePassword(oldPassword, newPassword);
    if (success) {
      alert('Password berhasil diperbarui.');
      passwordOverlay.style.display = 'none';
      location.reload();
    }
  } catch (error) {
    console.error('Password change error:', error);
    alert(`Gagal memperbarui password: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Simpan Password';
  }
};

const validatePasswords = (newPassword, confirmPassword) => {
  if (newPassword !== confirmPassword) {
    alert('Password baru dan konfirmasi password tidak cocok.');
    return false;
  }

  if (newPassword.length < 8) {
    alert('Password minimal 8 karakter.');
    return false;
  }

  return true;
};

const updatePassword = async (oldPassword, newPassword) => {
  const response = await fetch('/api/auth/update-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      oldPassword: oldPassword,
      newPassword: newPassword
    })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Gagal memperbarui password.');
  }

  return true;
};
