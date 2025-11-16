const net = require('net');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const HOST = '192.168.0.102';
const PORT = 3000;

const UPLOAD_DIR = path.join(__dirname, 'upload');
const DOWNLOAD_DIR = path.join(__dirname, 'download');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
});

const client = new net.Socket();

client.connect(PORT, HOST, () => {
console.log(`Connected to server at ${HOST}:${PORT}`);
askCommand();
});

client.on('data', data => {
const msg = data.toString();

if (msg.startsWith('/download ')) {
const parts = msg.split(' ');
const filename = parts[1];
const base64Data = parts.slice(2).join(' ');
const savePath = path.join(DOWNLOAD_DIR, filename);
fs.writeFileSync(savePath, Buffer.from(base64Data, 'base64'));
console.log(`File downloaded: ${filename} -> saved in ./download folder`);
} else {
console.log(`\n${msg}`);
}

askCommand();
});

client.on('close', () => {
console.log('Connection closed by server. Attempting to reconnect...');
setTimeout(() => client.connect(PORT, HOST), 5000);
});

client.on('error', err => {
console.error('Connection error:', err.message);
process.exit(1);
});

function askCommand() {
rl.question('Enter command (or message): ', input => {
const clean = input.trim();

if (clean.toLowerCase() === 'exit') {
client.write('/exit\n');
rl.close();
return;
}

if (clean.startsWith('/upload ')) {
const filename = clean.split(' ')[1];
const filePath = path.join(UPLOAD_DIR, filename);

if (fs.existsSync(filePath)) {
const fileData = fs.readFileSync(filePath);
client.write(`/upload ${filename} ${fileData.toString('base64')}\n`);
console.log(`Uploading ${filename} from ./upload folder...`);
} else {
console.log(`File not found in ./upload folder.`);
}

} else if (clean.startsWith('/download ')) {
const filename = clean.split(' ')[1];
client.write(`/download ${filename}\n`);

} else {
client.write(clean + '\n');
}
});
}
