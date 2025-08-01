import { ID_PATTERNS, PPAT_RANGE, getDivisiCode } from '../utils/constant.js';

export const generateUserID = async (client, divisiName) => {
    const divisiCode = getDivisiCode(divisiName);
  const pattern = ID_PATTERNS[divisiName] || ID_PATTERNS.default;
  const prefix = pattern.prefix || divisiCode;
  const totalLength = prefix.length + pattern.digits;

  const lastIDResult = await client.query(
    `SELECT userid FROM verified_users 
     WHERE userid LIKE $1 
       AND LENGTH(userid) = $2
       AND verifiedstatus = 'complete'
     ORDER BY userid DESC 
     LIMIT 1 FOR UPDATE`,
    [`${prefix}%`, totalLength]
  );

  let nextNum = 1;
  if (lastIDResult.rows.length > 0) {
    const lastID = lastIDResult.rows[0].userid;
    const lastNum = parseInt(lastID.slice(prefix.length)) || 0;
    nextNum = lastNum + 1;
    if (nextNum >= Math.pow(10, pattern.digits)) {
      throw new Error(`Nomor ID untuk divisi ${divisiName} telah mencapai batas maksimum`);
    }
  }

  return prefix + nextNum.toString().padStart(pattern.digits, '0');
};

export const generatePPATNumber = async (client) => {
    const lastPpatk = await client.query(
    `SELECT ppatk_khusus FROM verified_users 
       WHERE ppatk_khusus IS NOT NULL 
         AND ppatk_khusus != ''
         AND ppatk_khusus ~ '^[0-9]+$'  -- Only numeric values
         AND divisi IN ('PPAT', 'PPATS')
       ORDER BY ppatk_khusus::INTEGER DESC 
       LIMIT 1 FOR UPDATE`
  );
  
  let nextNum = PPAT_RANGE.min;
  if (lastPpatk.rows[0]?.ppatk_khusus) {
    nextNum = parseInt(lastPpatk.rows[0].ppatk_khusus) + 1;
    if (nextNum > PPAT_RANGE.max) {
      throw new Error("Nomor PPAT khusus telah mencapai batas maksimum");
    }
  }
  
  return nextNum.toString().padStart(5, '0');
};