const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Phục vụ file tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Lưu trữ trạng thái các phòng
const rooms = new Map();

// Tạo mã phòng ngẫu nhiên
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  console.log('Người dùng kết nối:', socket.id);

  // Tham gia phòng
  socket.on('join-room', (roomCode) => {
    // Nếu phòng không tồn tại, tạo mới
    if (!rooms.has(roomCode)) {
      rooms.set(roomCode, {
        players: [],
        board: Array(9).fill(''),
        currentPlayer: 'X',
        gameOver: false,
        winner: null
      });
    }

    const room = rooms.get(roomCode);
    
    // Kiểm tra số lượng người chơi
    if (room.players.length >= 2) {
      socket.emit('room-full');
      return;
    }

    // Xác định ký hiệu người chơi
    let playerSymbol;
    if (room.players.length === 0) {
      playerSymbol = 'X';
      room.players.push({ id: socket.id, symbol: 'X' });
    } else {
      playerSymbol = 'O';
      room.players.push({ id: socket.id, symbol: 'O' });
    }

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.playerSymbol = playerSymbol;

    // Thông báo cho tất cả người chơi trong phòng
    io.to(roomCode).emit('player-joined', {
      roomCode,
      players: room.players,
      playerSymbol,
      board: room.board,
      currentPlayer: room.currentPlayer,
      gameOver: room.gameOver,
      winner: room.winner
    });

    console.log(`Người chơi ${socket.id} tham gia phòng ${roomCode} với ký hiệu ${playerSymbol}`);
  });

  // Xử lý nước đi
  socket.on('make-move', (data) => {
    const { roomCode, cellIndex } = data;
    const room = rooms.get(roomCode);

    if (!room || room.gameOver) return;

    // Kiểm tra lượt chơi hợp lệ
    const currentPlayer = room.players.find(p => p.id === socket.id);
    if (!currentPlayer || currentPlayer.symbol !== room.currentPlayer) return;

    // Kiểm tra ô hợp lệ
    if (room.board[cellIndex] !== '') return;

    // Cập nhật bảng
    room.board[cellIndex] = room.currentPlayer;

    // Kiểm tra người thắng
    const winner = checkWinner(room.board);
    if (winner) {
      room.gameOver = true;
      room.winner = winner;
    } else if (!room.board.includes('')) {
      // Hòa
      room.gameOver = true;
    } else {
      // Chuyển lượt
      room.currentPlayer = room.currentPlayer === 'X' ? 'O' : 'X';
    }

    // Gửi cập nhật đến tất cả người chơi trong phòng
    io.to(roomCode).emit('game-updated', {
      board: room.board,
      currentPlayer: room.currentPlayer,
      gameOver: room.gameOver,
      winner: room.winner
    });
  });

  // Tạo phòng mới
  socket.on('create-room', () => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      players: [],
      board: Array(9).fill(''),
      currentPlayer: 'X',
      gameOver: false,
      winner: null
    });

    socket.emit('room-created', roomCode);
  });

  // Reset game
  socket.on('reset-game', (roomCode) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.board = Array(9).fill('');
      room.currentPlayer = 'X';
      room.gameOver = false;
      room.winner = null;

      io.to(roomCode).emit('game-reset', {
        board: room.board,
        currentPlayer: room.currentPlayer,
        gameOver: room.gameOver,
        winner: room.winner
      });
    }
  });

  // Ngắt kết nối
  socket.on('disconnect', () => {
    console.log('Người dùng ngắt kết nối:', socket.id);
    
    if (socket.roomCode) {
      const room = rooms.get(socket.roomCode);
      if (room) {
        // Xóa người chơi khỏi phòng
        room.players = room.players.filter(p => p.id !== socket.id);
        
        // Nếu phòng trống, xóa phòng
        if (room.players.length === 0) {
          rooms.delete(socket.roomCode);
        } else {
          // Thông báo người chơi đã rời
          io.to(socket.roomCode).emit('player-left', socket.id);
        }
      }
    }
  });
});

// Kiểm tra người thắng cuộc
function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Hàng ngang
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Hàng dọc
    [0, 4, 8], [2, 4, 6]             // Đường chéo
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
