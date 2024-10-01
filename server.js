const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/playgame', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

let players = {};
let board = Array(25).fill(null); // Bàn cờ 5x5
let currentPlayer = 'X'; // Người chơi bắt đầu là X
let gameOver = false; // Biến trạng thái trò chơi

io.on('connection', (socket) => {
    console.log('Người chơi đã kết nối:', socket.id);

    // Gán người chơi X hoặc O, chỉ tối đa 2 người chơi
    if (Object.keys(players).length < 2) {
        players[socket.id] = currentPlayer;
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        socket.emit('player-assigned', players[socket.id]);
    } else {
        socket.emit('room-full');
    }

    socket.on('make-move', (index) => {
        if (players[socket.id] && board[index] === null && currentPlayer === players[socket.id] && !gameOver) {
            board[index] = players[socket.id];
            io.emit('move-made', { index, player: players[socket.id] });

            if (checkWin(players[socket.id])) {
                io.emit('game-over', { winner: players[socket.id] });
                gameOver = true; // Đặt trạng thái trò chơi là kết thúc
            } else if (board.every(cell => cell !== null)) {
                io.emit('game-over', { winner: null }); // Hòa
                gameOver = true; // Trò chơi kết thúc khi hòa
            } else {
                currentPlayer = currentPlayer === 'X' ? 'O' : 'X'; // Đổi người chơi sau mỗi lượt
            }
        }
    });

    // Sự kiện "restart-game" khi người chơi bấm nút Play Again
    socket.on('play-again', () => {
        resetGame(); // Đặt lại trò chơi và gửi tín hiệu cho tất cả người chơi
        io.emit('reset-game');
    });

    socket.on('disconnect', () => {
        console.log('Người chơi đã ngắt kết nối:', socket.id);
        delete players[socket.id];
        resetGame();
        io.emit('reset-game');
    });
});

// Hàm kiểm tra điều kiện thắng
function checkWin(player) {
    const winPatterns = generateWinPatterns();
    return winPatterns.some(pattern => 
        pattern.every(index => board[index] === player)
    );
}

function generateWinPatterns() {
    let patterns = [];

    // Hàng ngang
    for (let i = 0; i < 25; i += 5) {
        for (let j = 0; j < 2; j++) {
            patterns.push([i + j, i + j + 1, i + j + 2, i + j + 3]);
        }
    }

    // Cột dọc
    for (let i = 0;  i < 5; i++) {
        for (let j = 0; j < 2; j++) {
            patterns.push([i + j * 5, i + (j + 1) * 5, i + (j + 2) * 5, i + (j + 3) * 5]);
        }
    }

    // Đường chéo chính
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            patterns.push([i * 5 + j, (i + 1) * 5 + (j + 1), (i + 2) * 5 + (j + 2), (i + 3) * 5 + (j + 3)]);
        }
    }

    // Đường chéo phụ
    for (let i = 0; i < 2; i++) {
        for (let j = 3; j < 5; j++) {
            patterns.push([i * 5 + j, (i + 1) * 5 + (j - 1), (i + 2) * 5 + (j - 2), (i + 3) * 5 + (j - 3)]);
        }
    }

    return patterns;
}

function resetGame() {
    board = Array(25).fill(null);  // Đặt lại bàn cờ
    currentPlayer = 'X';            // Người chơi X bắt đầu lại
    gameOver = false;               // Đặt lại trạng thái trò chơi để tiếp tục
}

server.listen(3000, () => {
    console.log('Server đang chạy trên cổng 3000');
});
