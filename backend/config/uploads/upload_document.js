import multer from 'multer';
import path from 'path';
import fs from 'fs';

// PDF Upload
const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = 'public/penting_F_simpan/folder_input_sspd/pdf';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    cb(null, `doc-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Image Upload
const imgStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadPath = 'public/penting_F_simpan/folder_input_sspd/images';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (_req, file, cb) => {
    cb(null, `img-${Date.now()}${path.extname(file.originalname)}`);
  }
});
// Middleware
export const pdfDUpload = multer({
  storage: pdfStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF yang diperbolehkan'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

export const imgDUpload = multer({
  storage: imgStorage,
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file JPEG/PNG yang diperbolehkan'), false);
    }
  },
  limits: { fileSize: 3 * 1024 * 1024 } // 3MB
});