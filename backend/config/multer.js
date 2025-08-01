import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Contoh penggunaan:
const TTD_STORAGE_PATH = path.join(__dirname, '..', 'storage', 'ttd');
// Konfigurasi penyimpanan KTP
export const uploadKTPStorage = multer.diskStorage({
    destination: (__req, __file, cb) => {
        cb(null, 'public/uploads');
    },
    filename: (__req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Konfigurasi penyimpanan Profil
export const uploadProfileStorage = multer.diskStorage({
    destination: (__req, __file, cb) => {
        cb(null, 'public/profile-photo');
    },
    filename: (_req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Konfigurasi penyimpanan SSPD
export const uploadSSPDStorage = multer.diskStorage({
    destination: (__req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, 'public/folder_input_sspd/pdf');
        } else if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, 'public/folder_input_sspd/images');
        } else {
            cb(new Error('File type not supported'), false);
        }
    },
    filename: (_req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Konfigurasi penyimpanan TTD
export const uploadTTDstorage = multer.diskStorage({
    destination: (_req, file, cb) => {
        const folders = {
            signature1: 'public/penting_Fpenyimpanan/folderttd/folderttdwp',
            signature2: 'public/penting_Fpenyimpanan/folderttd/folderttd_ppatk'
        };
        cb(null, folders[file.fieldname]);
    },
    filename: (req, file, cb) => {
        if (!req.body.nobooking) {
            return cb(new Error('No booking number provided'), false);
        }
        
        const ext = path.extname(file.originalname).toLowerCase();
        const filename = `${req.body.nobooking}_${Date.now()}_${file.fieldname}${ext}`;
        cb(null, filename);
    }
});

// Konfigurasi penyimpanan Stempel
export const uploadStempelStorage = multer.diskStorage({
    destination: (__req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, 'public/file_withStempel');
        } else {
            cb(new Error('File type not supported'), false);
        }
    },
    filename: (__req, file, cb) => {
        const originalName = path.basename(file.originalname, path.extname(file.originalname));
        const newFilename = `${originalName}_verif${path.extname(file.originalname)}`;
        cb(null, newFilename);
    }
});

if (!fs.existsSync(TTD_STORAGE_PATH)) {
    fs.mkdirSync(TTD_STORAGE_PATH, { recursive: true });
}

export const uploadTTDVerif = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, TTD_STORAGE_PATH);
        },
        filename: (req, file, cb) => {
            const userid = req.session.user.userid;
            const timestamp = Date.now();
            const ekstensi = file.mimetype.split('/')[1];
            const namaFile = `${userid}_${timestamp}.${ekstensi}`;
            cb(null, namaFile);
        }
    }),
    limits: { 
        fileSize: 3 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Hanya format JPEG/PNG yang diperbolehkan'), false);
        }
    }
});

// Konfigurasi upload untuk masing-masing jenis file
export const uploadKTP = multer({ storage: uploadKTPStorage });
export const uploadProfile = multer({ storage: uploadProfileStorage });
export const uploadSSPD = multer({ storage: uploadSSPDStorage });
export const uploadTTD = multer({ 
    storage: uploadTTDstorage,
    limits: {
        fileSize: 2 * 1024 * 1024,
        files: 2
    },
    fileFilter: (__req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Hanya file JPG/PNG yang diperbolehkan'), false);
        }
        cb(null, true);
    }
});
export const uploadStempelFile = multer({ storage: uploadStempelStorage });

// Konfigurasi TTD Kasie
export const uploadTTDKasieStorage = multer.memoryStorage();
export const uploadTTDKasie = multer({ storage: uploadTTDKasieStorage }).fields([
    { name: 'signature', maxCount: 1 }
]);

// Konfigurasi penyimpanan Dokumen PPATK
export const uploadDocumentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            // Get userid from session, fallback to 'unknown' if not available
            const userid = req.session?.user?.userid || 'unknown';
            const uploadPath = `public/uploads/documents/${userid}`;
            
            // Ensure the directory exists
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            
            cb(null, uploadPath);
        } catch (error) {
            console.error('Error creating upload directory:', error);
            // Fallback to a default directory
            const fallbackPath = 'public/uploads/documents/default';
            if (!fs.existsSync(fallbackPath)) {
                fs.mkdirSync(fallbackPath, { recursive: true });
            }
            cb(null, fallbackPath);
        }
    },
    filename: (req, file, cb) => {
        try {
            const userid = req.session?.user?.userid || 'unknown';
            const timestamp = Date.now();
            const ext = path.extname(file.originalname).toLowerCase();
            const filename = `${userid}_${timestamp}_${file.fieldname}${ext}`;
            cb(null, filename);
        } catch (error) {
            console.error('Error generating filename:', error);
            // Fallback filename
            const timestamp = Date.now();
            const ext = path.extname(file.originalname).toLowerCase();
            const filename = `unknown_${timestamp}_${file.fieldname}${ext}`;
            cb(null, filename);
        }
    }
});

export const uploadDocumentMiddleware = multer({
    storage: uploadDocumentStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 2 // Maksimal 2 file
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format file tidak didukung. Gunakan PDF, JPG, atau PNG.'), false);
        }
    }
});