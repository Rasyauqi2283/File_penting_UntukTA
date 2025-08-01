// utils/constants.js
export const DIVISI_MAP = {
    'PPAT': { code: 'PAT', name: 'PPAT' },
    'PPATS': { code: 'PATS', name: 'PPATS' },
    'Administrator': { code: 'A', name: 'Administrator' },
    'Customer Service': { code: 'CS', name: 'Customer Service' },
    'LTB': { code: 'LTB', name: 'LTB' },
    'LSB': { code: 'LSB', name: 'LSB' },
    'Peneliti': { code: 'P', name: 'Peneliti' },
    'Peneliti Validasi': { code: 'PV', name: 'Peneliti Validasi' },
    'Wajib Pajak': { code: 'WP', name: 'Wajib Pajak' },
    'BANK': { code: 'BANK', name: 'BANK' }
};

export const ID_PATTERNS = {
    'PPAT': { prefix: 'PAT', digits: 2 },
    'PPATS': { prefix: 'PATS', digits: 2 },
    'BANK': { prefix: 'BANK', digits: 2 },
    'LTB': { prefix: 'LTB', digits: 2 },
    'LSB': { prefix: 'LSB', digits: 2 },
    'default': { prefix: '', digits: 2 }
};

export const PPAT_RANGE = { min: 20000, max: 29999 };

export const getDivisiCode = (divisi) => DIVISI_MAP[divisi]?.code || divisi;
export const getDivisiName = (input) => {
  return DIVISI_MAP[input]?.name || 
         Object.values(DIVISI_MAP).find(d => d.code === input)?.name || 
         input;
};