document.addEventListener('DOMContentLoaded', () => {
    // Kết nối Socket.IO
    const socket = io();
    
    // Biến toàn cục
    let currentRoomCode = null;
    let currentPlayerSymbol = null;
    let gameState = {
        board: Array(9).fill(''),
        currentPlayer: 'X',
        gameOver: false,
        winner: null,
        players: []
    };
    
    // Tham chiếu đến các phần tử DOM
    const connectionPanel = document.getElementById('connectionPanel');
    const gamePanel = document.getElementById('gamePanel');
    const roomCodeInput = document.getElementById('roomCodeInput');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const roomCodeDisplay = document.getElementById('roomCodeDisplay');
    const gameBoard = document.getElementById('gameBoard');
    const status = document.getElementById('status');
    const resetBtn = document.getElementById('resetBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const copyBtn = document.getElementById('copyBtn');
    const player1 = document.getElementById('player1');
    const player2 = document.getElementById('player2');
    const player1Status = document.getElementById('player1Status');
    const player2Status = document.getElementById('player2Status');
    const connectionText = document.getElementById('connectionText');
    
    // Khởi tạo bảng cờ
    function initializeBoard() {
        gameBoard.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            cell.addEventListener('click', () => handleCellClick(i));
            gameBoard.appendChild(cell);
        }
    }
    
    // Xử lý khi click vào ô cờ
    function handleCellClick(index) {
        // Kiểm tra nếu ô trống, game chưa kết thúc và đến lượt người chơi
        if (gameState.board[index] === '' && 
            !gameState.gameOver && 
            currentPlayerSymbol === gameState.currentPlayer) {
            
            // Gửi nước đi đến server
            socket.emit('make-move', {
                roomCode: currentRoomCode,
                cellIndex: index
            });
        }
    }
    
    // Cập nhật giao diện
    function updateUI() {
        // Cập nhật bảng cờ
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            cell.textContent = gameState.board[index];
            if (gameState.board[index] === 'X') {
                cell.classList.add('x');
                cell.classList.remove('o');
            } else if (gameState.board[index] === 'O') {
                cell.classList.add('o');
                cell.classList.remove('x');
            } else {
                cell.classList.remove('x', 'o');
            }
        });
        
        // Cập nhật trạng thái người chơi
        const playerX = gameState.players.find(p => p.symbol === 'X');
        const playerO = gameState.players.find(p => p.symbol === 'O');
        
        player1Status.textContent = playerX ? "Đã kết nối" : "Đang chờ...";
        player2Status.textContent = playerO ? "Đã kết nối" : "Chưa kết nối";
        
        // Cập nhật trạng thái game
        if (gameState.gameOver) {
            if (gameState.winner) {
                status.textContent = `Người chiến thắng: ${gameState.winner === 'X' ? 'Người chơi 1 (X)' : 'Người chơi 2 (O)'}`;
                status.classList.add('win');
            } else {
                status.textContent = 'Hòa! Không có người chiến thắng';
                status.classList.remove('win');
            }
        } else {
            if (currentPlayerSymbol === gameState.currentPlayer) {
                status.textContent = `Lượt của bạn (${gameState.currentPlayer})`;
            } else {
                status.textContent = `Đang chờ đối thủ (${gameState.currentPlayer})...`;
            }
            status.classList.remove('win');
        }
        
        // Cập nhật người chơi hiện tại
        if (gameState.currentPlayer === 'X') {
            player1.classList.add('active');
            player2.classList.remove('active');
        } else {
            player2.classList.add('active');
            player1.classList.remove('active');
        }
        
        // Hiển thị thông báo nếu chưa có ký hiệu (khán giả)
        if (!currentPlayerSymbol) {
            status.textContent = "Bạn đang xem với tư cách khán giả";
        }
    }
    
    // Sự kiện Socket.IO
    
    // Kết nối thành công
    socket.on('connect', () => {
        connectionText.textContent = "Đã kết nối với server";
        console.log("Kết nối thành công với server");
    });
    
    // Ngắt kết nối
    socket.on('disconnect', () => {
        connectionText.textContent = "Mất kết nối với server";
        console.log("Ngắt kết nối với server");
    });
    
    // Phòng đã được tạo
    socket.on('room-created', (roomCode) => {
        currentRoomCode = roomCode;
        roomCodeDisplay.textContent = roomCode;
        connectionPanel.style.display = 'none';
        gamePanel.style.display = 'block';
        status.textContent = "Đang chờ người chơi thứ hai...";
    });
    
    // Người chơi đã tham gia phòng
    socket.on('player-joined', (data) => {
        gameState = data;
        currentPlayerSymbol = data.playerSymbol;
        currentRoomCode = data.roomCode;
        roomCodeDisplay.textContent = data.roomCode;
        connectionPanel.style.display = 'none';
        gamePanel.style.display = 'block';
        updateUI();
    });
    
    // Game đã được cập nhật
    socket.on('game-updated', (data) => {
        gameState.board = data.board;
        gameState.currentPlayer = data.currentPlayer;
        gameState.gameOver = data.gameOver;
        gameState.winner = data.winner;
        updateUI();
    });
    
    // Game đã được reset
    socket.on('game-reset', (data) => {
        gameState.board = data.board;
        gameState.currentPlayer = data.currentPlayer;
        gameState.gameOver = data.gameOver;
        gameState.winner = data.winner;
        updateUI();
    });
    
    // Phòng đã đầy
    socket.on('room-full', () => {
        alert("Phòng này đã đầy. Vui lòng tham gia phòng khác.");
    });
    
    // Người chơi đã rời
    socket.on('player-left', (playerId) => {
        // Cập nhật danh sách người chơi
        gameState.players = gameState.players.filter(p => p.id !== playerId);
        
        // Nếu người chơi hiện tại rời, đặt lại trạng thái
        if (playerId === socket.id) {
            currentPlayerSymbol = null;
        }
        
        updateUI();
        status.textContent = "Một người chơi đã rời khỏi phòng";
    });
    
    // Lắng nghe sự kiện click cho các nút
    
    // Tham gia phòng
    joinRoomBtn.addEventListener('click', () => {
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        if (roomCode) {
            socket.emit('join-room', roomCode);
        } else {
            alert("Vui lòng nhập mã phòng");
        }
    });
    
    // Tạo phòng mới
    createRoomBtn.addEventListener('click', () => {
        socket.emit('create-room');
    });
    
    // Reset game
    resetBtn.addEventListener('click', () => {
        if (currentRoomCode) {
            socket.emit('reset-game', currentRoomCode);
        }
    });
    
    // Tạo phòng mới
    newGameBtn.addEventListener('click', () => {
        socket.emit('create-room');
    });
    
    // Sao chép mã phòng
    copyBtn.addEventListener('click', () => {
        if (currentRoomCode) {
            navigator.clipboard.writeText(currentRoomCode)
                .then(() => {
                    alert("Đã sao chép mã phòng: " + currentRoomCode);
                })
                .catch(err => {
                    console.error('Lỗi khi sao chép: ', err);
                });
        }
    });
    
    // Cho phép nhấn Enter để tham gia phòng
    roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinRoomBtn.click();
        }
    });
    
    // Khởi tạo game
    initializeBoard();
});
