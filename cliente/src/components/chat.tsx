import React, { useState, useEffect, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputTextarea } from 'primereact/inputtextarea';
import { io } from 'socket.io-client';
import IpError from './IpError';

interface Message {
    author: string;
    message: string;
}

interface hostInfo {
    host: string;
    ip: string;
}

const SOCKET_SERVER_URL = "https://chat-tiempo-real-za6s.onrender.com";

const RoomControls: React.FC<{
    newRoomCapacity: string;
    setNewRoomCapacity: React.Dispatch<React.SetStateAction<string>>;
    handleCreateRoom: () => void;
    createRooms: boolean;
    roomPin: string;
    joinPin: string;
    setJoinPin: React.Dispatch<React.SetStateAction<string>>;
    handleJoinRoom: () => void;
    joiningRoom: boolean;
    joinError: string;
}> = ({
    newRoomCapacity,
    setNewRoomCapacity,
    handleCreateRoom,
    createRooms,
    roomPin,
    joinPin,
    setJoinPin,
    handleJoinRoom,
    joiningRoom,
    joinError,
}) => {
    return (
        <div>
            <div>
                <h3>Crear Nueva Sala</h3>
                <div className="p-inputgroup">
                    <span className="p-inputgroup-addon">Capacidad:</span>
                    <InputText
                        type="number"
                        value={newRoomCapacity}
                        onChange={(e) => setNewRoomCapacity(e.target.value)}
                        placeholder="Ej: 5"
                    />
                </div>
                <Button
                    label={createRooms ? "Creando..." : "Crear Sala"}
                    onClick={handleCreateRoom}
                    disabled={createRooms}
                    icon="pi pi-plus"
                    className="p-button-success"
                />
                {roomPin && <p>PIN de la sala creada: <strong>{roomPin}</strong></p>}
            </div>

            <div className="mt-4">
                <h3>Unirse a Sala Existente</h3>
                <div className="p-inputgroup">
                    <span className="p-inputgroup-addon">PIN:</span>
                    <InputText
                        type="text"
                        value={joinPin}
                        onChange={(e) => setJoinPin(e.target.value)}
                        placeholder="Ingresar PIN"
                    />
                </div>
                <Button
                    label={joiningRoom ? "Uniéndose..." : "Unirse a Sala"}
                    onClick={handleJoinRoom}
                    disabled={joiningRoom}
                    icon="pi pi-sign-in"
                    className="p-button-info"
                />
                {joinError && <p className="p-error">{joinError}</p>}
            </div>
        </div>
    );
};

export const Chat: React.FC = () => {
    const [nickname, setNickname] = useState<string>("");
    const [tempNick, setTempNick] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [connected, setConnected] = useState<Boolean>(false);
    const [host, setHost] = useState<hostInfo>({ host: "", ip: "" });
    const [connectionError, setConnectionError] = useState<string>(""); // Nuevo estado para error de conexión
    const socketRef = useRef<any>(null);

    const [creatingRoom, setCreatingRoom] = useState<boolean>(false);
    const [newRoomCapacity, setNewRoomCapacity] = useState<string>("5");
    const [roomPin, setRoomPin] = useState<string>("");
    const [joiningRoom, setJoiningRoom] = useState<boolean>(false);
    const [joinPin, setJoinPin] = useState<string>("");
    const [joinError, setJoinError] = useState<string>("");
    const [currentRoomPin, setCurrentRoomPin] = useState<string | null>(null);
    const [inRoom, setInRoom] = useState<boolean>(false); // Nuevo estado para controlar si estamos en una sala

    useEffect(() => {
        if (!nickname) return;

        socketRef.current = io(SOCKET_SERVER_URL);

        socketRef.current.on('host_info', (infoHost: hostInfo) => {
            setHost(infoHost);
            setConnected(true);
            setConnectionError("");
        });

        socketRef.current.on('connection_error', (error: { message: string }) => {
            setConnectionError(error.message);
            setConnected(false);
            socketRef.current.disconnect(); // Desconectar el socket
        });

        socketRef.current.on('receive_message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        socketRef.current.on('room_created', (data: { pin: string }) => {
            setRoomPin(data.pin);
            setCurrentRoomPin(data.pin);
            setCreatingRoom(false);
            setJoiningRoom(false);
            setJoinError("");
            setInRoom(true); // Marcamos que estamos en una sala
            alert(`Sala creada con PIN: ${data.pin}`);
        });

        socketRef.current.on('join_success', () => {
            setCurrentRoomPin(joinPin);
            setJoiningRoom(false);
            setCreatingRoom(false);
            setJoinError("");
            setInRoom(true); // Marcamos que estamos en una sala
            alert(`Te has unido a la sala ${joinPin}`);
        });

        socketRef.current.on('join_error', (error: { message: string }) => {
            setJoinError(error.message);
            setJoiningRoom(false);
            setCurrentRoomPin(null);
            setInRoom(false); // Aseguramos que no estamos marcados como en una sala
            alert(`Error al unirse: ${error.message}`);
        });

        socketRef.current.on('user_joined', (data: { userId: string }) => {
            console.log(`Usuario ${data.userId} se unió a la sala ${currentRoomPin}`);
            // Actualizar lista de usuarios en la UI si es necesario
        });

        socketRef.current.on('user_left', (data: { userId: string }) => {
            console.log(`Usuario ${data.userId} dejó la sala ${currentRoomPin}`);
            // Actualizar lista de usuarios en la UI si es necesario
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };

    }, [nickname, joinPin]);

    const handleCreateRoom = () => {
        setCreatingRoom(true);
        socketRef.current.emit('create_room', newRoomCapacity);
    };

    const handleJoinRoom = () => {
        setJoiningRoom(true);
        socketRef.current.emit('join_room', joinPin);
    };

    const handleNickname = () => {
        const nick = tempNick.trim();
        if (!nick) return;
        setNickname(nick);
    };

    const sendMessage = () => {
        const msg = message.trim();
        if (!msg || !connected || !currentRoomPin) return; // Asegurarse de estar en una sala

        const msgObj = {
            author: nickname,
            message: msg,
        };

        socketRef.current.emit('send_message', msgObj);
        setMessages(prev => [...prev, msgObj]);
        setMessage("");
    };

    const handleRetryConnection = () => {
        setConnectionError(""); // Limpiar el error
        setNickname(""); // Reiniciar el nickname para volver al formulario inicial
        // El useEffect se encargará de intentar reconectar cuando se ingrese un nuevo nickname
    };

    // Mostrar el componente de error si hay un connection_error
    if (connectionError) {
        return (
            <IpError
                errorMessage={connectionError}
                onRetry={handleRetryConnection}
            />
        );
    }

    if (!nickname) {
        return (
            <div className="flex justify-content-center align-items-center h-screen">
                <Card title="Bienvenido al chat" className="w-25">
                    <div className="p-fluid">
                        <div className="p-field">
                            <label htmlFor="txtNick">Ingrese su nick</label>
                            <InputText
                                id="txtNick"
                                placeholder="Nick"
                                value={tempNick}
                                onChange={(e) => setTempNick(e.target.value)}
                            />
                        </div>
                        <Button
                            label="Conectarse"
                            icon="pi pi-check"
                            className="p-button-raised p-button-info"
                            onClick={handleNickname}
                        />
                    </div>
                </Card>
            </div>
        );
    }

    // Mostrar el formulario de creación/unión de salas si no estamos en una sala
    if (!inRoom) {
        return (
            <div className="flex justify-content-center align-items-center h-screen">
                <Card title="Crear o Unirse a una Sala" className="w-30">
                    <RoomControls
                        newRoomCapacity={newRoomCapacity}
                        setNewRoomCapacity={setNewRoomCapacity}
                        handleCreateRoom={handleCreateRoom}
                        createRooms={creatingRoom}
                        roomPin={roomPin}
                        joinPin={joinPin}
                        setJoinPin={setJoinPin}
                        handleJoinRoom={handleJoinRoom}
                        joiningRoom={joiningRoom}
                        joinError={joinError}
                    />
                </Card>
            </div>
        );
    }

    // Mostrar el chat si estamos en una sala
    return (
        <div className="flex justify-content-center">
            <Card title={`Chat en la sala ${currentRoomPin} con ${nickname}`} className="w-25">
                <div className="host-info">
                    Conectado desde: <strong>{host.host}</strong> ({host.ip})
                </div>
                <div className="messages-container">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.author === nickname ? "sent" : "received"}`}>
                            <strong>{msg.author}: </strong>
                            {msg.message}
                        </div>
                    ))}
                </div>
                <div className="input-container">
                    <InputTextarea
                        rows={3}
                        cols={30}
                        autoResize={true}
                        id="txtMessage"
                        placeholder="Escribe un mensaje..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                sendMessage();
                            }
                        }}
                    />
                    <Button
                        label="Enviar"
                        icon="pi pi-send"
                        className="p-button-raised p-button-success"
                        onClick={sendMessage}
                    />
                </div>
            </Card>
        </div>
    );
};