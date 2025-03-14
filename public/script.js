document.addEventListener('DOMContentLoaded', () => {
    const cells = document.querySelectorAll('.cell');
    const resetButton = document.getElementById('reset');
    let currentPlayer = 'X';

    // Function to update the board UI based on game state
    const updateBoard = (state) => {
        state.board.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellElement = document.querySelector(`.cell[data-row='${rowIndex}'][data-col='${colIndex}']`);
                cellElement.textContent = cell;
            });
        });
        currentPlayer = state.currentPlayer;
    };

    // Fetch current game state from server
    const fetchGameState = async () => {
        const response = await fetch('/api/game-status');
        const state = await response.json();
        updateBoard(state);
    };

    // Handle cell click
    cells.forEach(cell => {
        cell.addEventListener('click', async () => {
            if (!cell.textContent && currentPlayer === 'X') { // Only allow 'X' to move for now
                const row = cell.getAttribute('data-row');
                const col = cell.getAttribute('data-col');
                const response = await fetch('/api/make-move', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ row, col, player: currentPlayer }),
                });
                const result = await response.json();
                if (result.success) {
                    fetchGameState();
                }
            }
        });
    });

    // Handle reset button click
    resetButton.addEventListener('click', async () => {
        await fetch('/api/reset-game', { method: 'POST' });
        fetchGameState();
    });

    // Initial fetch of game state
    fetchGameState();
});
