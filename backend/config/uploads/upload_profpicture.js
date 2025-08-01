import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';

const PROFILE_PHOTO_PATH = 'public/penting_F_simpan/profile-photo';

// Optimized storage configuration
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await fs.mkdir(PROFILE_PHOTO_PATH, { recursive: true });
      cb(null, PROFILE_PHOTO_PATH);
    } catch (err) {
      cb(err);
    }
  },
  filename: async (req, file, cb) => {
    const userid = req.session?.user?.userid;
    if (!userid) return cb(new Error('User ID tidak valid'));

    const ext = path.extname(file.originalname).toLowerCase();
    const newFilename = `${userid}_fotoProfile${ext}`; // Format: 12345_fotoProfile.jpg

    // Hapus file lama jika ada
    try {
      const oldFiles = await fs.readdir(PROFILE_PHOTO_PATH);
      for (const file of oldFiles) {
        if (file.startsWith(`${userid}_fotoProfile`)) {
          await fs.unlink(path.join(PROFILE_PHOTO_PATH, file));
          console.log(`Deleted old profile photo for user ${userid}: ${file}`);
        }
      }
    } catch (err) {
      console.warn('Gagal hapus file lama:', err.message);
    }

    cb(null, newFilename); // Gunakan nama file baru
  }
});

// File filter for image validation
const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedTypes.includes(ext)) {
    return cb(new Error('Only image files are allowed (jpg, jpeg, png, webp)'), false);
  }
  cb(null, true);
};

// Image processor middleware
const processImage = async (req, _res, next) => {
  if (!req.file) return next();
  
  try {
    const processedImage = await sharp(req.file.path)
      .resize(500, 500, {
        fit: 'cover',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 80,
        mozjpeg: true 
      })
      .toBuffer();

    await fs.writeFile(req.file.path, processedImage);
    next();
  } catch (err) {
    next(err);
  }
};

const uploadProfile = multer({
  storage,
  fileFilter,
  limits: { 
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1 
  }
});

export { uploadProfile, processImage };