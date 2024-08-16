// services/encryptionUtils.js
const crypto = require('crypto');

const algorithm = 'aes-256-cbc'; // AES encryption algorithm
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 256-bit key
const iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex'); // 128-bit IV

// Encrypt the text
function encrypt(text) {
    let cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Decrypt the text
function decrypt(encryptedText) {
    let decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { encrypt, decrypt };
