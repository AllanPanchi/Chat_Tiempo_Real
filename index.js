require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dns = require('dns');
const { Socket } = require('dgram');
const { connected } = require('process');

const app = express();

const rooms = {}

const connectedSockets = {}

function generatePin(){
    let pin;
    do{
        pin = Math.floor(100000 + Math.random() * 900000).toString();
    }while(rooms[pin])
    return pin;
}

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    }
});

io.on('connection', (socket) => {
    const clienteIp = socket.handshake.address.replace('::ffff:', '');
    console.log(`Cliente conectado: ${clienteIp}`);

    dns.reverse(clienteIp, (err, hostnames) => {
        const hostname = err ? clienteIp : hostnames[0];
        console.log(`Cliente Hostname: ${hostname}`);
        socket.emit('host_info', { ip: clienteIp, host: hostname });
    });

    socket.on('create_room', (capacity) => {
        const pin = generatePin();
        rooms[pin] = {
            pin: pin,
            capacidad: capacity,
            participantes: [socket.id]
        }
        socket.join(pin);
        socket.emit('room_created', {pin: pin});
        io.to(pin).emit('user_joined', {user_id: socket.id});
        console.log(`Sala creada ${pin} con capacidad de ${capacity} por ${socket.id}`);
    });

    socket.on('join_room', (pin) => {
        if(!rooms[pin]){
            socket.emit('join_error', {message: 'El PIN de la sala no es válido'});
            return;
        }

        if(rooms[pin].participantes.lenght >= rooms[pin].capacidad){
            socket.emit('join_error', {message: 'La sala está llena'});
            return;
        }

        if(connectedSockets.id){
            socket.emit('join_error', {message: 'Ya estás en otra sala'});
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
        const roomId = connectedSockets[socket.id];
        if (roomId && rooms[roomId]) {
            rooms[roomId].participantes = rooms[roomId].participantes.filter(id => id !== socket.id);
            io.to(roomId).emit('user_left', { userId: socket.id });
            delete connectedSockets[socket.id];
            console.log(`Usuario ${socket.id} se desconectó de la sala ${roomId}`);
            if (rooms[roomId].participantes.length === 0) {
                delete rooms[roomId]; 
                console.log(`Sala ${roomId} eliminada por estar vacía.`);
            }
        }
        console.log(`Cliente desconectado: ${clienteIp}`);
    });
});

const PORT = 5000;

server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto: ${PORT}`);
});