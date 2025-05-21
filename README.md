# Servidor de Salas de Chat en Tiempo Real

Este proyecto es un servidor backend desarrollado con **Node.js**, **Express** y **Socket.IO** que permite la creación y gestión de salas de chat en tiempo real. Los usuarios pueden crear salas con un PIN único, unirse a salas existentes y enviar mensajes en tiempo real. Incluye una validación de sesiones por IP para garantizar que solo un dispositivo por dirección IP pueda conectarse al servidor, evitando conexiones múltiples desde el mismo dispositivo.

## Características

- **Creación de salas**: Los usuarios pueden crear salas con una capacidad específica, generando un PIN único.
- **Unión a salas**: Los usuarios pueden unirse a salas existentes usando el PIN, siempre que no se haya alcanzado la capacidad máxima.
- **Mensajería en tiempo real**: Los usuarios en la misma sala pueden enviar y recibir mensajes en tiempo real.
- **Validación por IP**: Solo se permite una conexión por dirección IP, denegando intentos de conexión desde la misma IP hasta que la sesión anterior se desconecte.
- **Liberación automática de IPs**: Las IPs se liberan automáticamente después de 15 minutos de inactividad, permitiendo nuevas conexiones.
- **Soporte CORS**: Configurado para permitir conexiones desde orígenes específicos (por ejemplo, `http://localhost:3000` y `https://ransilvav29.github.io`, este ultimo siendo el link  del deployd para el frontend).
- **Información de host**: Proporciona información sobre la IP y el hostname del cliente conectado mediante DNS reverse lookup.

## Tecnologías utilizadas

- **Node.js**: Entorno de ejecución para el servidor.
- **Express**: Framework para crear el servidor HTTP.
- **Socket.IO**: Biblioteca para comunicación en tiempo real.
- **CORS**: Middleware para manejar solicitudes entre dominios.
- **DNS**: Módulo nativo de Node.js para resolución de hostnames.
- **dotenv**: Gestión de variables de entorno.

## Requisitos previos

- **Node.js**
- **npm** (gestor de paquetes de Node.js).

## Instalación

1. Clona este repositorio en tu máquina local:

   ```bash
   git clone https://github.com/RansilvaV29/backend-chat-websoket.git
   cd <NOMBRE_DEL_REPOSITORIO>
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Crea un archivo `.env` en la raíz del proyecto y configura el puerto del servidor (opcional):

   ```env
   PORT=5000
   ```

   Si no se especifica, el servidor usará el puerto 5000 por defecto.

4. Inicia el servidor:

   ```bash
   node index.js
   ```

   El servidor estará disponible en `http://localhost:5000` (o el puerto configurado).

## Uso

1. **Conectar al servidor**:
   - Un cliente (por ejemplo, una aplicación web) debe conectarse al servidor mediante Socket.IO desde uno de los orígenes permitidos (`http://localhost:3000` o `https://ransilvav29.github.io`).
   - Solo se permite una conexión por dirección IP. Si se intenta conectar otro dispositivo desde la misma IP, se denegará con un mensaje de error.

2. **Crear una sala**:
   - Emite el evento `create_room` con la capacidad deseada (número máximo de participantes).
   - Recibirás un evento `room_created` con el PIN único de la sala.

3. **Unirse a una sala**:
   - Emite el evento `join_room` con el PIN de la sala.
   - Si el PIN es válido y la sala no está llena, recibirás un evento `join_success`.

4. **Enviar mensajes**:
   - Emite el evento `send_message` con los datos del mensaje.
   - Todos los participantes en la sala recibirán el evento `receive_message` con los datos.

5. **Desconexión**:
   - Cuando un usuario se desconecta, se notifica a los demás participantes con el evento `user_left`.
   - Si la sala queda vacía, se elimina automáticamente.

## Estructura del proyecto

```
├── server.js       # Código principal del servidor
├── .env            # Variables de entorno (no incluido en el repositorio)
├── package.json    # Dependencias y scripts del proyecto
└── README.md       # Documentación del proyecto
```

## Eventos de Socket.IO

### Del cliente al servidor
- `create_room(capacity)`: Crea una nueva sala con la capacidad especificada.
- `join_room(pin)`: Intenta unirse a una sala con el PIN proporcionado.
- `send_message(data)`: Envía un mensaje a la sala actual.
- `disconnect`: Se dispara cuando el cliente se desconecta.

### Del servidor al cliente
- `host_info({ ip, host })`: Información sobre la IP y hostname del cliente.
- `room_created({ pin })`: Confirma la creación de una sala con su PIN.
- `join_success`: Confirma que el cliente se unió a una sala.
- `user_joined({ userId })`: Notifica que un nuevo usuario se unió a la sala.
- `user_left({ userId })`: Notifica que un usuario abandonó la sala.
- `receive_message(data)`: Recibe un mensaje enviado en la sala.
- `connection_error({ message })`: Indica un error de conexión (por ejemplo, IP ya en uso).
- `create_error({ message })`: Indica un error al crear una sala.
- `join_error({ message })`: Indica un error al intentar unirse a una sala.


## Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles (si se incluye).