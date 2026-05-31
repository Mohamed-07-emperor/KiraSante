const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const generateQRCode = async (patientId) => {
  const code = `KIRA-${patientId}-${Date.now()}`;
  const qrDataURL = await QRCode.toDataURL(code, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 300
  });
  return { code, qrDataURL };
};

const generateUniqueCode = () =>
  `KIRA-${uuidv4().replace(/-/g,'').substring(0,12).toUpperCase()}`;

module.exports = { generateQRCode, generateUniqueCode };
