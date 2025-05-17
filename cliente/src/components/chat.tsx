import React, {useState, useRef, useEffect} from "react";
import { io } from "socket.io-client";
import { Card } from "primereact/card";
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';


const SOCKET_SERVER_URL = "http://localhost:5000/";

interface Message{
    author: string,
    message: string,
}

interface hostInfo{
    host: string,
    ip: string
}


export const Chat: React.FC = () => {
    const [nickname, setNickname] = useState<string>("");
    const [tempNick, setTempNick] = useState<string>("");
    const [message, setMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [connected, setConnected] = useState<Boolean>(false);
    const [host, setHost] = useState<hostInfo>({
        host: "",
        ip: ""
    });
    const socketRef = useRef<any>(null);

    const [createRooms, setCreateRooms] = useState<boolean>(false);
    const [newRoomCapacity, setNewRoomCapacity] = useState<string>("5"); // Valor por defecto
    const [roomPin, setRoomPin] = useState<string>("");
    const [joiningRoom, setJoiningRoom] = useState<boolean>(false);
    const [joinPin, setJoinPin] = useState<string>("");
    const [joinError, setJoinError] = useState<string>("");
    const [currentRoomPin, setCurrentRoomPin] = useState<string | null>(null);
    
    useEffect(() => {
        if(!nickname) return;

        socketRef.current = io(SOCKET_SERVER_URL);

        socketRef.current.on('host_info', (infoHost: hostInfo) => {
            setHost(infoHost);
            setConnected(true);
        });

        socketRef.current.on('receive_message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        socketRef.current.on(('room_created'), (data: {pin: string}) => {
            setRoomPin(data.pin);
            setCurrentRoomPin(data.pin);
            setCreateRooms(false);
            setJoiningRoom(false);
            setJoinError("");
            alert(`Sala creada con el pin ${data.pin}`)
        });
        
        socketRef.current.on('join_success', () => {
            setCurrentRoomPin(joinPin);
            setJoiningRoom(false);
            setCreateRooms(false);
            setJoinError("");
            alert(`Te has unido a la sala ${joinPin}`);
        });

        socketRef.current.on('join_error', (error: { message: string }) => {
            setJoinError(error.message);
            setJoiningRoom(false);
            setCurrentRoomPin(null);
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

        return() => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        }

    }, [nickname, joinPin]);

    const handleCreateRoom = () => {
        setCreateRooms(true);
        socketRef.current.emit('create_room', newRoomCapacity);
    };

    const handleJoinRoom = () => {
        setJoiningRoom(true);
        socketRef.current.emit('join_room', joinPin);
    };

    const handleNickname = () => {
        const nick = tempNick.trim();
        if(!nick) return;
        setNickname(nick);
    };

    const sendMessage = () => {
        const msg = message.trim();
        if(!msg || !connected) return;

        const msgObj = {
            author: nickname,
            message: msg,
        }
        
        socketRef.current.emit('send_message', msgObj);

        setMessages(prev => [...prev, msgObj]);
        setMessage("");
    }

    if(!nickname){
        return(
            <div className="">
                <Card title="Bienvedido al chat" className="w-25">
                    <div className="p-fluid">
                        <div className="p-field">
                            <label htmlFor="txtNick">Ingrese su nick</label>
                            <InputText
                                id="txtNick"
                                placeholder = "Nick"
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

     return (
        <div className="app">
            <div>
                <h3>Crear Nueva Sala</h3>
                <input
                    type="number"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(e.target.value)}
                    placeholder="Capacidad (ej: 5)"
                />
                <button onClick={handleCreateRoom} disabled={createRooms}>
                    {createRooms ? "Creando..." : "Crear Sala"}
                </button>
                {roomPin && <p>PIN de la sala creada: {roomPin}</p>}
            </div>

            <div>
                <h3>Unirse a Sala Existente</h3>
                <input
                    type="text"
                    value={joinPin}
                    onChange={(e) => setJoinPin(e.target.value)}
                    placeholder="Ingresar PIN"
                />
                <button onClick={handleJoinRoom} disabled={joiningRoom}>
                    {joiningRoom ? "Uniéndose..." : "Unirse a Sala"}
                </button>
                {joinError && <p style={{ color: 'red' }}>{joinError}</p>}
            </div>

            {currentRoomPin && (
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
                        {/* ... (textarea y botón de enviar mensaje existentes) ... */}
                    </div>
                </Card>
            )}
        </div>
    );
}

