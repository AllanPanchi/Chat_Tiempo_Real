require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dns = require('dns');

const app = express();

const rooms = {};
const connectedSockets = {};
const connectedIps = {};

const IP_TIMEOUT = 10000; // 10 segundos para liberar IPs inactivas

function generatePin() {
    let pin;
    do {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (rooms[pin]);
    return pin;
}

const allowedOrigins = [
    'http://localhost:3000',
    'https://ransilvav29.github.io'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

io.on('connection', (socket) => {
    // Obtener IP del cliente, manejando proxies
    const clientIp = socket.handshake.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     socket.handshake.address.replace('::ffff:', '');
    console.log(`Cliente intentando conectar: IP=${clientIp}, SocketID=${socket.id}`);

    // Validar si la IP ya está conectada
    if (connectedIps[clientIp]) {
        console.log(`Conexión rechazada: IP ${clientIp} ya está en uso (SocketID existente: ${connectedIps[clientIp]})`);
        socket.emit('connection_error', { message: 'Ya hay un usuario conectado desde este dispositivo (misma IP)' });
        socket.disconnect(true);
        return;
    }

    // Registrar la IP del socket
    connectedIps[clientIp] = socket.id;
    console.log(`IP ${clientIp} registrada para SocketID ${socket.id}`);

    // Configurar un temporizador para liberar la IP si no se desconecta correctamente
    const ipTimeout = setTimeout(() => {
        if (connectedIps[clientIp] === socket.id) {
            delete connectedIps[clientIp];
            console.log(`IP ${clientIp} liberada por timeout`);
        }
    }, IP_TIMEOUT);

    dns.reverse(clientIp, (err, hostnames) => {
        const hostname = err ? clientIp : hostnames[0];
        console.log(`Cliente Hostname: ${hostname}`);
        socket.emit('host_info', { ip: clientIp, host: hostname });
    });

    socket.on('create_room', (capacity) => {
        const parsedCapacity = parseInt(capacity);
        if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
            socket.emit('create_error', { message: 'Capacidad inválida' });
            return;
        }

        const pin = generatePin();
        rooms[pin] = {
            pin: pin,
            capacidad: parsedCapacity,
            participantes: [socket.id]
        };
        socket.join(pin);
        connectedSockets[socket.id] = pin;
        socket.emit('room_created', { pin: pin });
        io.to(pin).emit('user_joined', { user_id: socket.id });
        console.log(`Sala creada ${pin} con capacidad de ${capacity} por ${socket.id}`);
        console.log(`Participantes en la sala ${pin}: ${rooms[pin].participantes}`);
    });

    socket.on('join_room', (pin) => {
        if (!rooms[pin]) {
            socket.emit('join_error', { message: 'El PIN de la sala no es válido' });
            return;
        }

        if (rooms[pin].participantes.length >= rooms[pin].capacidad) {
            socket.emit('join_error', { message: 'La sala está llena' });
            return;
        }

        if (connectedSockets[socket.id]) {
            socket.emit('join_error', { message: 'Ya estás en otra sala' });
            return;
        }

        rooms[pin].participantes.push(socket.id);
        socket.join(pin);
        connectedSockets[socket.id] = pin;
        socket.emit('join_success');
        io.to(pin).emit('user_joined', { userId: socket.id });
        console.log(`Usuario ${socket.id} se unió a la sala ${pin}`);
    });

    socket.on('send_message', (data) => {
        const roomId = connectedSockets[socket.id];
        if (roomId) {
            io.to(roomId).emit('receive_message', data);
            console.log(`Mensaje recibido en la sala ${roomId}: ${data.message} de ${socket.id}`);
        }
    });

    socket.on('disconnect', () => {
        clearTimeout(ipTimeout);
        const roomId = connectedSockets[socket.id];
        if (roomId && rooms[roomId]) {
            rooms[roomId].participantes = rooms[roomId].participantes.filter(id => id !== socket.id);
            io.to(roomId).emit('user_left', { userId: socket.id });
            console.log(`Usuario ${socket.id} se desconectó de la sala ${roomId}`);
            if (rooms[roomId].participantes.length === 0) {
                delete rooms[roomId];
                console.log(`Sala ${roomId} eliminada por estar vacía.`);
            }
        }
        delete connectedIps[clientIp];
        delete connectedSockets[socket.id];
        console.log(`Cliente desconectado: IP=${clientIp}, SocketID=${socket.id}`);
        console.log(`Estado de connectedIps: ${JSON.stringify(connectedIps)}`);
    });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto: ${PORT}`);
});