// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const os = require('os');
require('events').defaultMaxListeners = 30;


app.use(express.static('public'));

const localIP = getLocalIPAddress();
console.log(localIP)

let players = {};
let playerId = 0;
let bullets = {};
let bulletId = 0;
let tag;


io.on('connection', socket => {
  socket.on('gName', gtag => {
    tag = gtag
    console.log('A user connected:', tag + "(" + socket.id + ")");
  });
  players[socket.id] = { x: 50, y: 50, angle: 0, id: playerId + 1, gunAng: 40, tag: tag};
  playerId++

  // Send current state to new player
  socket.emit('currentPlayers', players);
  // Tell others a new player joined
  socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

  socket.on('move', dir => {
    const p = players[socket.id];
    if (!p) return;


    const speed = 1.5;
    const rotateSpeed = 0.03;

    if (dir === 'left') p.angle -= rotateSpeed;
    if (dir === 'right') p.angle += rotateSpeed;
    if (dir === 'up') {
      p.x += Math.cos(p.angle) * speed;
      p.y += Math.sin(p.angle) * speed;
    }
    if (dir === 'down') {
      p.x -= Math.cos(p.angle) * speed;
      p.y -= Math.sin(p.angle) * speed;
    }
  });



  socket.on('rotate', angleDelta => {
    if (players[socket.id]) {
      players[socket.id].angle += angleDelta;
    }
  });

socket.on('aim', data => {
  const p = players[socket.id];
  if (!p) return;

  const centerX = p.x + 20;
  const centerY = p.y + 10;

  const dx = data.x - centerX;
  const dy = data.y - centerY;

  const target = Math.atan2(dy, dx);

  if (p.gunAng === undefined) p.gunAng = target;

  let delta = target - p.gunAng;

  // Wrap angle to [-PI, PI]
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));

  // Smoothly rotate toward target
  p.gunAng += delta * 0.02; // You can tweak 0.2 for smoother or faster turning
});



  socket.on('shoot', () => {
    const p = players[socket.id];
    if (!p) return;

    const speed = 7;
    bullets[bulletId] = {
      id: bulletId,
      x: p.x + 20,
      y: p.y + 10,
      vx: Math.cos(p.gunAng) * speed,
      vy: Math.sin(p.gunAng) * speed,
      owner: socket.id
    };

    io.emit('newBullet', bullets[bulletId]);
    io.emit('playShotSound', p.id);
    bulletId++;
  });


  socket.on('disconnect', () => {
    console.log('User disconnected:', tag + "(" + socket.id + ")");
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});


//function getRandomColor() {
//  return '#' + Math.floor(Math.random() * 16777215).toString(16);
//}

const port = 9026

http.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://${localIP}:${port}`);
});



setInterval(() => {
  const updatedBullets = {};

  for (let id in bullets) {
    const b = bullets[id];
    b.x += b.vx;
    b.y += b.vy;

    let hit = false;
    for (let pid in players) {
      if (pid === b.owner) continue;
      const side = getCollisionSide(b, players[pid])
      if (side) {
        let event;
        if(side == "left"){if(true){event = "tL"}}
        if(side == "right"){if(true){event = "tR"}}
        io.emit('playerHit', { playerId: pid, bulletId: id, event: event});
        hit = true;
        break;
      }
    }

    // Only keep bullets that did NOT hit and are still on screen
    if (!hit && b.x >= 0 && b.x <= 1000 && b.y >= 0 && b.y <= 1000) {
      updatedBullets[id] = b;
    }
  }

  bullets = updatedBullets;
  // io.emit('updateBullets', bullets);
  io.emit('state', {
  players: players,
  bullets: bullets
});

}, 1000 / 60);





function getCollisionSide(bullet, player) {
  // Bullet center
  const bx = bullet.x + 2.5;
  const by = bullet.y + 2.5;

  // Player center
  const px = player.x + 20;
  const py = player.y + 10;

  const angle = player.angle || 0;

  // Translate bullet to player's local space
  const dx = bx - px;
  const dy = by - py;

  // Unrotate bullet position
  const unrotatedX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
  const unrotatedY = dx * Math.sin(-angle) + dy * Math.cos(-angle);

  // Check if inside unrotated player rectangle
  const inside =
    unrotatedX > -20 && unrotatedX < 20 &&
    unrotatedY > -10 && unrotatedY < 10;

  if (!inside) return null; // No collision

  // Calculate distance to each side
  const distLeft = Math.abs(unrotatedX + 20);
  const distRight = Math.abs(20 - unrotatedX);
  const distTop = Math.abs(unrotatedY + 10);
  const distBottom = Math.abs(10 - unrotatedY);

  const min = Math.min(distLeft, distRight, distTop, distBottom);

  if (min === distLeft) return 'left';
  if (min === distRight) return 'right';
  if (min === distTop) return 'top';
  if (min === distBottom) return 'bottom';

  return null;
}



function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'WiFi error';
}