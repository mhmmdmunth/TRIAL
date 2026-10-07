/**
 * SCRIPT UNPACK / EXTRACTOR
 * Cara pakai:
 * 1. Simpan file ini sebagai unpack.cjs
 * 2. Pastikan file SOURCE_CODE_LENGKAP.txt berada di folder yang sama
 * 3. Jalankan: node unpack.cjs
 * Maka seluruh file dan struktur folder proyek akan otomatis terbuat!
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2] || 'SOURCE_CODE_LENGKAP.txt';

if (!fs.existsSync(inputFile)) {
  console.error(`❌ Error: File "${inputFile}" tidak ditemukan!`);
  console.log('Pastikan file SOURCE_CODE_LENGKAP.txt berada di folder yang sama dengan script ini.');
  process.exit(1);
}

console.log(`🚀 Membaca file ${inputFile}...`);
const content = fs.readFileSync(inputFile, 'utf8');

// Regex untuk mencari setiap pemisah file: # FILE: <filepath>
const fileSeparatorRegex = /# ={10,}\s*\n# FILE:\s*(.+?)\s*\n# ={10,}\s*\n/g;

let match;
const matches = [];

while ((match = fileSeparatorRegex.exec(content)) !== null) {
  matches.push({
    filePath: match[1].trim(),
    index: match.index,
    contentStartIndex: match.index + match[0].length,
  });
}

if (matches.length === 0) {
  console.error('❌ Tidak ditemukan tag file (# FILE: ...) dalam file teks tersebut.');
  process.exit(1);
}

console.log(`📦 Ditemukan ${matches.length} file dalam bundle. Memulai ekstraksi...\n`);

for (let i = 0; i < matches.length; i++) {
  const current = matches[i];
  const next = matches[i + 1];

  const targetPath = current.filePath;
  const fileContent = next
    ? content.substring(current.contentStartIndex, next.index)
    : content.substring(current.contentStartIndex);

  const cleanContent = fileContent.trimEnd();

  const dir = path.dirname(targetPath);
  if (dir && dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(targetPath, cleanContent + '\n', 'utf8');
  console.log(`✅ [${i + 1}/${matches.length}] Berhasil dibuat: ${targetPath} (${cleanContent.length} bytes)`);
}

console.log('\n🎉 SEMUA FILE BERHASIL DIEKSTRAK!');
console.log('Selanjutnya Anda tinggal menjalankan:');
console.log('1. npm install');
console.log('2. npm run dev');
