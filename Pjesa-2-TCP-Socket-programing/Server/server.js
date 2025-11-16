const net = require('net');
const fs = require('fs');
const path = require('path');

const HOST = '192.168.0.102';
const PORT = 3000;
const MAX_CLIENTS = 4;
const IDLE_TIMEOUT = 60000;
const FILES_DIR = path.join(__dirname, 'files');

if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR);

let clients = [];
let stats = { totalBytes: 0, messages: {} };
let clientRoles = {};

function logMessage(msg) {
    fs.appendFileSync(path.join(__dirname, 'messages_log.txt'), msg + '\n');
}

function logStats() {
    const data = `--- SERVER STATS (${new Date().toLocaleString()}) ---
Active connections: ${clients.length}
Client IPs: ${clients.map(c => c.remoteAddress).join(', ') || 'None'}
Messages per client: ${JSON.stringify(stats.messages)}
Total bytes: ${stats.totalBytes} bytes
-------------------------------------\n`;
    fs.writeFileSync(path.join(__dirname, 'server_stats.txt'), data);
}

function getClientRole(socket) {
    return clientRoles[socket.remoteAddress] || 'read-only';
}

function handleFileCommand(socket, cmd, arg, extra) {
    const role = getClientRole(socket);
    const filePath = arg ? path.join(FILES_DIR, arg) : null;

    switch (cmd) {
        case '/list':
            fs.readdir(FILES_DIR, (err, files) => {
                if (err) return socket.write('Error reading directory.\n');
                socket.write(`Files on server: ${files.join(', ') || 'None'}\n`);
            });
            break;

        case '/read':
            if (!arg) return socket.write('Usage: /read <filename>\n');
            if (!fs.existsSync(filePath)) return socket.write('File not found.\n');
            const content = fs.readFileSync(filePath, 'utf8');
            socket.write(`--- ${arg} ---\n${content}\n`);
            break;

        case '/delete':
            if (role !== 'admin') return socket.write('Permission denied. Admin only.\n');
            if (!arg) return socket.write('Usage: /delete <filename>\n');
            if (!fs.existsSync(filePath)) return socket.write('File not found.\n');
            fs.unlinkSync(filePath);
            socket.write(`File ${arg} deleted from server.\n`);
            break;

        case '/upload':
            if (role !== 'admin') return socket.write('Permission denied. Admin only.\n');
            if (!arg || !extra) return socket.write("Usage: /upload <filename>\n");
            fs.writeFileSync(filePath, Buffer.from(extra, 'base64'));
            socket.write(`File uploaded to server: ${arg}\n`);
            break;

        case '/download':
            if (!arg) return socket.write('Usage: /download <filename>\n');
            if (!fs.existsSync(filePath)) return socket.write('File not found.\n');
            const fileData = fs.readFileSync(filePath);
            socket.write(`/download ${arg} ${fileData.toString('base64')}\n`);
            break;

        case '/info':
            if (!arg) return socket.write('Usage: /info <filename>\n');
            if (!fs.existsSync(filePath)) return socket.write('File not found.\n');
            const statsFile = fs.statSync(filePath);
            socket.write(`File: ${arg}\nSize: ${statsFile.size} bytes\nCreated: ${statsFile.birthtime}\nModified: ${statsFile.mtime}\n`);
            break;

        case '/search':
            if (!arg) return socket.write('Usage: /search <keyword>\n');
            fs.readdir(FILES_DIR, (err, files) => {
                if (err) return socket.write('Error reading files.\n');
                const matched = files.filter(f => f.includes(arg));
                socket.write(`Matching files on server: ${matched.join(', ') || 'None'}\n`);
            });
            break;
    }
}

function handleCommand(socket, message) {
    const parts = message.trim().split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts[1];
    const extra = parts.slice(2).join(' ');

    const adminOnly = ['/delete', '/upload'];

    if (adminOnly.includes(cmd) && getClientRole(socket) !== 'admin') {
        socket.write('Permission denied. Admin only.\n');
        return;
    }

    switch (cmd) {
        case '/help':
            socket.write(
`Available commands:
------------------------------------------
/time             Show current server time
/date             Show current server date
/name             Show server name
/listclients      List all connected clients
/broadcast <msg>  Send a message to all clients
/list             List files on server
/read <file>      Read file content
/delete <file>    Delete a file from server (admin only)
/upload <file>    Upload a file to server (admin only)
/download <file>  Download a file from server
/search <text>    Search files on server
/info <file>      Show file info
/exit             Disconnect
/help             Show this message
------------------------------------------\n`
            );
            break;

        case '/time':
            socket.write(`Server Time: ${new Date().toLocaleTimeString()}\n`);
            break;

        case '/date':
            socket.write(`Server Date: ${new Date().toLocaleDateString()}\n`);
            break;


        case '/name':
            socket.write('Server Name: Group 28 Server\n');
            break;

        case '/listclients':
            socket.write(`Connected clients:\n${clients.map(c => `- ${c.remoteAddress}`).join('\n')}\n`);
            break;

        case '/broadcast':
            if (!arg) return socket.write('Usage: /broadcast <message>\n');
            const msg = parts.slice(1).join(' ');
            clients.forEach(c => {
                if (c !== socket) c.write(`[Broadcast from ${socket.remoteAddress}]: ${msg}\n`);
            });
            socket.write('Message broadcasted.\n');
            break;

        case '/exit':
            socket.write('Goodbye!\n');
            socket.end();
            break;

        default:
            if (['/list', '/read', '/delete', '/upload', '/download', '/info', '/search'].includes(cmd)) {
                handleFileCommand(socket, cmd, arg, extra);
            } else {
                socket.write('Unknown command. Use /help\n');
            }
    }
}

const server = net.createServer(socket => {
    if (clients.length >= MAX_CLIENTS) {
        socket.write('Server full. Try later.\n');
        socket.end();
        return;
    }

    clients.push(socket);
    const ip = socket.remoteAddress;
    clientRoles[ip] = (clients.length === 1) ? 'admin' : 'read-only';
    stats.messages[ip] = 0;

    console.log(`Client connected: ${ip}, role: ${clientRoles[ip]}`);
    socket.write(`Connected. Your role: ${clientRoles[ip]}\n`);

    let lastActive = Date.now();

    socket.on('data', data => {
        const msg = data.toString().trim();
        stats.totalBytes += Buffer.byteLength(data);
        stats.messages[ip]++;
        logMessage(`[${ip}] ${msg}`);
        lastActive = Date.now();

        handleCommand(socket, msg);
    });

    socket.on('end', () => {
        clients = clients.filter(c => c !== socket);
        delete clientRoles[ip];
        console.log(`Client disconnected: ${ip}`);
    });

    const interval = setInterval(() => {
        if (Date.now() - lastActive > IDLE_TIMEOUT) {
            socket.write('Disconnected due to inactivity.\n');
            socket.end();
            clearInterval(interval);
        }
    }, 10000);
});

server.listen(PORT, HOST, () => {
    console.log(`Server running at ${HOST}:${PORT}`);
});

process.stdin.on('data', input => {
    if (input.toString().trim().toUpperCase() === 'STATS') {
        logStats();
        console.log('Stats updated in server_stats.txt');
    }
});

