# Raptor Rooms - Complete Low-Level Flow

## 1. Project Entry Point

Browser me jab user `http://localhost:3000/` open karta hai, Express `public` folder se static files serve karta hai.

Main login page:

```txt
public/index.html
```

Is file me login/register UI hai. Page ke end par ye JavaScript load hoti hai:

```html
<script src="./js/auth.js"></script>
```

So login/register ka actual frontend logic yahan hai:

```txt
public/js/auth.js
```

## 2. Server Startup Flow

Main backend file:

```txt
server.js
```

Server me ye major setup hota hai:

```js
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const rooms = new Map();
```

Meaning:

- `app` Express application hai.
- `server` HTTP server hai.
- `wss` WebSocket server hai.
- `rooms` ek in-memory Map hai jisme rooms store hote hain.

MongoDB connection:

```js
mongoose.connect(process.env.MONGO_URI)
```

Middlewares:

```js
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());
```

Meaning:

- `public` folder browser ko serve hota hai.
- JSON request body parse hoti hai.
- Cookies `req.cookies` me available hoti hain.

Auth routes mount hote hain:

```js
app.use("/api/auth", authRoutes);
```

So `routes/authRoutes.js` ke routes `/api/auth` prefix ke saath available hote hain.

## 3. Register Flow

User `index.html` par Register form fill karta hai aur Register button click karta hai.

Frontend file:

```txt
public/js/auth.js
```

Register button click par request jaati hai:

```js
fetch("/api/auth/register", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
});
```

Final API:

```txt
POST /api/auth/register
```

Server route:

```txt
routes/authRoutes.js
```

```js
router.post("/register", registerUser);
```

Controller:

```txt
controllers/authController.js
```

```js
registerUser(req, res)
```

Register backend flow:

1. `req.body` se `username` aur `password` nikalta hai.
2. Check karta hai username/password empty to nahi.
3. MongoDB me existing user check karta hai:

```js
User.findOne({ username })
```

4. Password hash karta hai:

```js
bcrypt.hash(password, 10)
```

5. User create karta hai:

```js
User.create({
  username,
  password: hashedPassword
})
```

User model:

```txt
models/User.js
```

Schema fields:

```js
username
password
createdAt
```

Success response:

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "username": "..."
  }
}
```

Frontend registration success ke baad alert show karta hai aur login section wapas show karta hai.

## 4. Login Flow

User login form fill karta hai aur Login button click karta hai.

Frontend:

```txt
public/js/auth.js
```

Request:

```js
fetch("/api/auth/login", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
});
```

Final API:

```txt
POST /api/auth/login
```

Server route:

```js
router.post("/login", loginUser);
```

Controller:

```js
loginUser(req, res)
```

Login backend flow:

1. `req.body` se `username` aur `password` nikalta hai.
2. MongoDB me user find karta hai:

```js
User.findOne({ username })
```

3. Password compare karta hai:

```js
bcrypt.compare(password, user.password)
```

4. Agar password correct hai to JWT create hota hai:

```js
jwt.sign(
  {
    userId: user._id,
    username: user.username
  },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
)
```

5. Server browser me cookie set karta hai:

```js
res.cookie("token", token, {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000
});
```

Important:

- Token localStorage me save nahi hota.
- Token HTTP-only cookie me save hota hai.
- Browser future requests me cookie automatically bhejta hai.

Login success ke baad frontend redirect karta hai:

```js
window.location.replace("/rooms.html");
```

## 5. Rooms Page Flow

Login ke baad page load hota hai:

```txt
public/rooms.html
```

Is page me ye JS load hoti hai:

```html
<script src="./js/rooms.js" defer></script>
```

Frontend logic:

```txt
public/js/rooms.js
```

Page load par:

```js
initializeRooms();
```

Inside `initializeRooms()`:

```js
fetch("/api/auth/me")
```

Final API:

```txt
GET /api/auth/me
```

Route:

```js
router.get("/me", authMiddleware, getMe);
```

Pehle `authMiddleware` run hota hai.

Middleware file:

```txt
middleware/authMiddleware.js
```

Middleware flow:

1. Cookie se token nikalta hai:

```js
const token = req.cookies.token;
```

2. Token verify karta hai:

```js
jwt.verify(token, process.env.JWT_SECRET)
```

3. Decoded user request me store karta hai:

```js
req.user = decoded;
```

4. `next()` call karta hai.

Then `getMe()` response deta hai:

```json
{
  "message": "User authenticated successfully",
  "user": {
    "id": "...",
    "username": "..."
  }
}
```

Frontend current username show karta hai.

## 6. Create Room Flow

User room name enter karke Create Room button click karta hai.

Frontend:

```txt
public/js/rooms.js
```

Function call:

```js
sendRoomAction("create", createRoomInput, createRoomBtn);
```

Request:

```js
fetch(`/api/rooms/${type}`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ roomName })
});
```

Final API:

```txt
POST /api/rooms/create
```

Important:

`routes/roomRoutes.js` project me currently exist nahi karta. Room routes directly `server.js` me defined hain.

Server route:

```js
app.post("/api/rooms/create", authMiddleware, (req, res) => {
```

Backend create flow:

1. `authMiddleware` JWT cookie verify karta hai.
2. `req.body` se `roomName` nikalta hai.
3. Empty room name reject hota hai.
4. 50 characters se bada room name reject hota hai.
5. Check karta hai room already exist karta hai ya nahi:

```js
rooms.has(name)
```

6. Agar room nahi hai to create:

```js
rooms.set(name, new Set());
```

Success response:

```json
{
  "message": "Room created successfully",
  "roomName": "room-name"
}
```

Frontend:

```js
sessionStorage.setItem("raptorRoom", data.roomName);
window.location.assign("/chat.html");
```

Meaning:

- Room name browser ke `sessionStorage` me save hota hai.
- User chat page par redirect hota hai.

## 7. Join Room Flow

User existing room name enter karke Join Room button click karta hai.

Frontend:

```js
sendRoomAction("join", joinRoomInput, joinRoomBtn);
```

Final API:

```txt
POST /api/rooms/join
```

Server route:

```js
app.post("/api/rooms/join", authMiddleware, (req, res) => {
```

Backend join flow:

1. `authMiddleware` JWT cookie verify karta hai.
2. `req.body` se `roomName` nikalta hai.
3. Room name validate hota hai.
4. Check hota hai room memory me exist karta hai ya nahi:

```js
rooms.has(name)
```

5. Agar room nahi hai to `404`.
6. Agar room hai to success response.

Success response:

```json
{
  "message": "Room found",
  "roomName": "room-name"
}
```

Frontend:

```js
sessionStorage.setItem("raptorRoom", data.roomName);
window.location.assign("/chat.html");
```

## 8. Chat Page Flow

Chat page:

```txt
public/chat.html
```

Attached JS:

```html
<script src="./js/chat.js" defer></script>
```

Frontend logic:

```txt
public/js/chat.js
```

Sabse pehle room name read hota hai:

```js
const roomName = sessionStorage.getItem("raptorRoom");
```

Agar room name nahi mila to redirect hota hai.

Current code me issue:

```js
window.location.replace("/room.html");
```

Actual file:

```txt
rooms.html
```

So correct redirect should be:

```js
window.location.replace("/rooms.html");
```

Agar room name mil gaya to:

```js
initializeChat();
```

Inside `initializeChat()`:

1. User auth verify:

```js
fetch("/api/auth/me")
```

2. Username UI me set.
3. WebSocket connection open:

```js
const protocol = location.protocol === "https:" ? "wss:" : "ws:";
socket = new WebSocket(`${protocol}//${location.host}`);
```

Local example:

```txt
ws://localhost:3000
```

## 9. WebSocket Authentication Flow

Server file:

```txt
server.js
```

WebSocket connection handler:

```js
wss.on("connection", (ws, req) => {
```

Browser WebSocket handshake ke saath same-domain cookies bhi bhejta hai.

Server cookie se token nikalta hai:

```js
const token = getCookieValue(req, "token");
```

Agar token nahi hai:

```js
ws.close(1008, "Please login first");
```

Agar token hai to verify:

```js
jwt.verify(token, process.env.JWT_SECRET)
```

Then user data socket object par save:

```js
ws.userId = decoded.userId;
ws.username = decoded.username;
ws.isAuthenticated = true;
```

Client ko authentication success message:

```json
{
  "type": "authenticated",
  "message": "WebSocket authentication successful",
  "user": {
    "id": "...",
    "username": "..."
  }
}
```

## 10. WebSocket Join Room Flow

Client `authenticated` message receive karta hai:

```js
if (data.type === "authenticated") {
    authenticated = true;

    socket.send(JSON.stringify({
        type: "joinRoom",
        roomName
    }));

    return;
}
```

Server `message` event me data receive karta hai:

```js
ws.on("message", (message) => {
```

If message type:

```js
data.type === "joinRoom"
```

Then server:

1. Room name validate karta hai.
2. `joinRoom(roomName, ws)` call karta hai.
3. Room exist karta hai ya nahi check hota hai.
4. WebSocket client room ke Set me add hota hai:

```js
newRoom.add(ws);
ws.room = roomName;
```

5. Online count broadcast:

```js
sendRoomOnlineCount(roomName);
```

6. Current client ko response:

```json
{
  "type": "roomJoined",
  "roomName": "room-name"
}
```

7. Dusre room members ko notification:

```txt
username joined the room
```

## 11. Chat Message Flow

User message type karke submit karta hai.

Frontend:

```txt
public/js/chat.js
```

Submit par:

```js
socket.send(JSON.stringify({
    type: "chat",
    message
}));
```

Server:

```js
if (data.type === "chat") {
```

Backend flow:

1. Socket kis room me hai check:

```js
const roomName = ws.room;
```

2. Room get:

```js
const room = rooms.get(roomName);
```

3. Server client-sent username par trust nahi karta.
4. Authenticated socket username use karta hai:

```js
const chatMessage = JSON.stringify({
    ...data,
    username: ws.username
});
```

5. Room ke sab clients ko message send:

```js
room.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
        client.send(chatMessage);
    }
});
```

Client receive:

```js
if (data.type === "chat") {
    addMessage(`${data.username}: ${data.message}`);
}
```

## 12. Disconnect Flow

User tab close karta hai ya back button click karta hai.

WebSocket close hota hai.

Server:

```js
ws.on("close", () => {
```

Flow:

1. Check karta hai socket kis room me tha:

```js
if (ws.room) {
```

2. Room get:

```js
const room = rooms.get(roomName);
```

3. Dusre clients ko notification:

```txt
username left the room
```

4. Socket room se delete:

```js
room.delete(ws);
```

5. Agar room empty ho gaya:

```js
rooms.delete(roomName);
```

Meaning:

- Rooms temporary memory me hain.
- Server restart ya room empty hone par room delete ho jata hai.

## 13. Important Issues In Current Code

### Issue 1: `roomRoutes.js` missing

IDE me `routes/roomRoutes.js` open hai, but workspace me ye file currently exist nahi karti.

Room APIs abhi directly `server.js` me hain:

```js
app.post("/api/rooms/create", ...)
app.post("/api/rooms/join", ...)
```

### Issue 2: Rooms database me save nahi hote

Rooms yahan store hote hain:

```js
const rooms = new Map();
```

So:

- Server restart = rooms gone.
- Room empty = room deleted.
- MongoDB only users ke liye use ho rahi hai.

### Issue 3: Wrong redirect path in `chat.js`

Current:

```js
window.location.replace("/room.html");
window.location.assign("/room.html");
```

But actual file:

```txt
rooms.html
```

Correct:

```js
window.location.replace("/rooms.html");
window.location.assign("/rooms.html");
```

### Issue 4: `checkSession()` commented in `auth.js`

In `public/js/auth.js`:

```js
// checkSession();
```

Because of this, already logged-in user `/` page par aaye to automatic `/rooms.html` redirect nahi hota.

If enabled:

```js
checkSession();
```

Then logged-in user login page skip karke rooms page par chala jayega.

### Issue 5: `public/script.js` old/unused lag raha hai

Current HTML files ye JS use kar rahi hain:

```txt
public/js/auth.js
public/js/rooms.js
public/js/chat.js
```

`public/script.js` current pages me linked nahi hai.

## 14. Full Request Flow Summary

```txt
Browser /
  -> public/index.html
  -> public/js/auth.js

Register:
  auth.js
  -> POST /api/auth/register
  -> routes/authRoutes.js
  -> controllers/authController.js/registerUser
  -> models/User.js
  -> MongoDB

Login:
  auth.js
  -> POST /api/auth/login
  -> routes/authRoutes.js
  -> controllers/authController.js/loginUser
  -> MongoDB user find
  -> bcrypt password compare
  -> JWT create
  -> token cookie set
  -> redirect /rooms.html

Rooms page:
  public/rooms.html
  -> public/js/rooms.js
  -> GET /api/auth/me
  -> authMiddleware verifies cookie JWT
  -> show username

Create room:
  rooms.js
  -> POST /api/rooms/create
  -> authMiddleware
  -> server.js room Map
  -> sessionStorage raptorRoom
  -> redirect /chat.html

Join room:
  rooms.js
  -> POST /api/rooms/join
  -> authMiddleware
  -> server.js room Map check
  -> sessionStorage raptorRoom
  -> redirect /chat.html

Chat page:
  public/chat.html
  -> public/js/chat.js
  -> sessionStorage se roomName
  -> GET /api/auth/me
  -> WebSocket connect ws://localhost:3000

WebSocket:
  server.js
  -> cookie token verify
  -> send authenticated
  -> client sends joinRoom
  -> server adds socket to room Set
  -> online count broadcast
  -> chat messages broadcast to room members
```

