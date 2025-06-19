// public/client.js
const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let players = {};
let bullets = {};
let AmountOfPlayers = 0;
let c;
let BalisticCalcolator = false
let mouseX = 0, mouseY = 0

let tag = window.prompt("Enter your gamer tag:")
if (tag == "" || tag == null) { tag = "gamer" }
socket.emit('gName', tag);



let lastShotTime = 0;
const shootCooldown = 5000; // milliseconds between shots


socket.on('currentPlayers', serverPlayers => {
  Object.assign(players, serverPlayers);
  draw();
});

socket.on('newPlayer', data => {
  players[data.id] = data;
  AmountOfPlayers++
});

socket.on('playerMoved', data => {
  if (players[data.id]) {
    players[data.id].x = data.x;
    players[data.id].y = data.y;
  }
});


socket.on('state', ({ players: serverPlayers, bullets: serverBullets }) => {
  players = serverPlayers || {};
  bullets = serverBullets || {};

  for (let id in players) {
    const p = players[id];
    if (!p) continue;

    // Preserve drawnGunAngle if not set
    if (p.drawnGunAngle === undefined) {
      p.drawnGunAngle = p.gunAng || 0;
    }
  }
});





socket.on('playerDisconnected', id => {
  AmountOfPlayers--
  delete players[id];
});

socket.on('newBullet', data => {
  bullets[data.id] = data;
});

socket.on('playShotSound', data => {
  if (c.id != data) {
    playSound("fire", 50)
  }
});

//socket.on('updateBullets', serverBullets => {
//  Object.assign(bullets, serverBullets);
//});

socket.on('playerHit', data => {
  for (let id in players) {
    const p = players[id];
    if (!p) continue;
    console.log(data.event)
  }
  
});


const keysDown = new Set();

document.addEventListener('keydown', e => {
  keysDown.add(e.key.toLowerCase());
});

document.addEventListener('keyup', e => {
  keysDown.delete(e.key.toLowerCase());
});

document.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;


});


//keysDown.add(key);

setInterval(() => {
  socket.emit('aim', { x: mouseX, y: mouseY });

  const now = Date.now();

  if (keysDown.has('w')) socket.emit('move', 'up');
  if (keysDown.has('s')) socket.emit('move', 'down');
  if (keysDown.has('a')) socket.emit('move', 'left');
  if (keysDown.has('d')) socket.emit('move', 'right');

  if (keysDown.has(' ') && now - lastShotTime >= shootCooldown) {
    socket.emit('shoot');
    playSound("reloading", 50)
    lastShotTime = now;


  }
}, 1000 / 60);

setInterval(() => {
  if (keysDown.has('z')) { BalisticCalcolator = !BalisticCalcolator }
}, 1000 / 2);






function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // clear the canvas

  // Draw bullets
  for (let id in bullets) {
    const b = bullets[id];
    if (!b) continue;
    ctx.fillStyle = 'black';
    ctx.fillRect(b.x, b.y, 5, 5);
  }
  if (BalisticCalcolator) {
    for (let i = 0; i < 45; i++) {
      for (let id in players) {
        const p = players[id];
        if (!p) continue;
        const speed = 7;

        let x = p.x + 20;
        let y = p.y + 10;
        let vx = Math.cos(p.gunAng) * speed;
        let vy = Math.sin(p.gunAng) * speed;
        ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.fillRect(x + vx * i * 4, y + vy * i * 4, 5, 5);
      }
    }
  }


  // Draw rotated players
  for (let id in players) {
    const p = players[id];
    if (!p) continue;
    c = players[id]
    ctx.save();
    ctx.translate(p.x + 20, p.y + 10);   // move to center of player
    ctx.rotate(p.angle || 0);           // apply rotation
    if (isOdd(p.id)) {
      ctx.fillStyle = 'blue';
    } else {
      ctx.fillStyle = 'red';
    }

    ctx.fillRect(-20, -10, 40, 20);     // draw centered rectangle
    ctx.restore();
  }

  for (let id in players) {
    const p = players[id];
    const centerX = p.x + 20;
    const centerY = p.y + 10;


    if (typeof p.drawnGunAngle !== 'number') {
      p.drawnGunAngle = p.gunAng || 0;
    }


    if (typeof p.gunAng === 'number') {
      const current = p.drawnGunAngle;
      const target = p.gunAng;
      const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

      p.drawnGunAngle = current + delta * 0.9; // 0.1 = smoothing factor
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(p.drawnGunAngle || 0); // ✅ Use smoothed angle
    ctx.fillStyle = 'black';
    ctx.fillRect(0, -2.5, 30, 5);
    ctx.restore();

  }





  requestAnimationFrame(draw); // keep the loop going
}

function playSound(sound, volume = 100) {
  const audio = new Audio("sounds/" + sound + '.wav');
  audio.volume = volume / 100;
  audio.play();
}

function isOdd(num) {
  let one = num % 2
  if (one == 0) {
    return false
  } else {
    return true
  }
}
