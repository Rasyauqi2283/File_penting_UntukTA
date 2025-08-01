import multer from 'multer';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TTD_VERIF_PATH = path.join(__dirname, '..', 'public', 'penting_F_simpan', 'tanda-tangan-verif');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

// Ensure storage directory exists
const ensureDir = async (path) => {
  try {
    await fs.access(path);
  } catch {
    await fs.mkdir(path, { recursive: true });
  }
};

// Memory storage for initial upload
const storage = multer.memoryStorage();
// Tambahkan pada uploadTTDVerif middleware:
const fileFilter = (req, file, cb) => {
    // Validasi ekstensi file
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        return cb(new Error('Hanya file gambar yang diperbolehkan'), false);
    }
    // Validasi dimensi gambar
    sharp(file.buffer).metadata()
        .then(metadata => {
            if (metadata.width > 2000 || metadata.height > 1000) {
                return cb(new Error('Dimensi gambar terlalu besar'), false);
            }
            cb(null, true);
        });
};

const processTTDVerif = async (req, res, next) => {
  if (!req.file) return next();
  
  try {
    await ensureDir(TTD_VERIF_PATH);
    
    const userid = req.session?.user?.userid || 'unknown';
    const timestamp = Date.now();
    const fileExt = req.file.mimetype.split('/')[1] || 'jpg';
    const filename = `ttd-${userid}-${timestamp}.${fileExt}`;
    const filePath = path.join(TTD_VERIF_PATH, filename);
    const publicUrl = `/penting_F_simpan/tanda-tangan-verif/${filename}`;

    // Process image
    await sharp(req.file.buffer)
      .greyscale()
      .resize(800, 300, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255 }
      })
      .toFormat('jpeg', { 
        quality: 90,
        mozjpeg: true 
      })
      .toFile(filePath);

    // Attach processed file info to request
    req.processedTTD = {
      path: filePath,
      url: publicUrl,
      size: (await fs.stat(filePath)).size,
      mimeType: 'image/jpeg' // Default to JPEG since we converted it
    };
    
    next();
  } catch (err) {
    next(err);
  }
};

// Multer configuration for TTD Verifikasi
const uploadTTDVerif = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

// Middleware for handling TTD verification upload
export const ttdVerifMiddleware = [
  uploadTTDVerif.single('signature'),
  processTTDVerif
];

// For routes that need multiple TTD types
export const uploadTTD = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const folders = {
        signature1: path.join(__dirname, '..', 'public', 'penting_F_simpan', 'folderttd', 'folderttdwp'),
        signature2: path.join(__dirname, '..', 'public', 'penting_F_simpan', 'folderttd', 'folderttd_ppatk')
      };
      const destPath = folders[file.fieldname];
      ensureDir(destPath)
        .then(() => cb(null, destPath))
        .catch(err => cb(err));
    },
    filename: (req, file, cb) => {
      if (!req.body.nobooking) {
        return cb(new Error('Nomor booking diperlukan'), false);
      }
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.body.nobooking}_${Date.now()}_${file.fieldname}${ext}`);
    }
  }),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 2
  },
  fileFilter
});

// For Kasie signature (memory storage only)
export const uploadTTDKasie = multer({ 
  storage: multer.memoryStorage() 
}).fields([{ name: 'signature', maxCount: 1 }]);