document.addEventListener('DOMContentLoaded', () => {
    const cells = document.querySelectorAll('.cell');
    const resetButton = document.getElementById('reset');
    const statusElement = document.getElementById('current-player');
    let currentPlayer = 'X';
    let gameStatus = 'in_progress';
    
    // Allow both X and O to play from this client
    // No longer restricting to a single local player
    
    // Function to update the board UI based on game state
    const updateBoard = (state) => {
        state.board.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
                const cellElement = document.querySelector(`.cell[data-row='${rowIndex}'][data-col='${colIndex}']`);
                cellElement.textContent = cell || '';
            });
        });
        currentPlayer = state.currentPlayer;
        gameStatus = state.status;
        
        // Update status display
        if (gameStatus === 'won' && state.winner) {
            statusElement.textContent = `Player ${state.winner} won the game!`;
        } else if (gameStatus === 'draw') {
            statusElement.textContent = 'Game ended in a draw!';
        } else {
            statusElement.textContent = `Current Player: ${currentPlayer}`;
        }
    };

    // Set up Server-Sent Events connection
    const setupSSE = () => {
        const eventSource = new EventSource('/api/game-updates');
        
        eventSource.onmessage = (event) => {
            const state = JSON.parse(event.data);
            updateBoard(state);
        };
        
        eventSource.onerror = (error) => {
            console.error('SSE connection error:', error);
            eventSource.close();
            // Try to reconnect after a delay
            setTimeout(setupSSE, 3000);
        };
        
        return eventSource;
    };

    // Handle cell click
    cells.forEach(cell => {
        cell.addEventListener('click', async () => {
            // Only allow moves if cell is empty and game is in progress
            if (!cell.textContent && gameStatus === 'in_progress') {
                const row = parseInt(cell.getAttribute('data-row'));
                const col = parseInt(cell.getAttribute('data-col'));
                
                try {
                    const response = await fetch('/api/make-move', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ row, col, player: currentPlayer }),
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error('Error making move:', errorData.error);
                        alert(`Move error: ${errorData.error}`);
                    }
                } catch (error) {
                    console.error('Network error when making move:', error);
                    alert('Network error when making move. Please try again.');
                }
            }
        });
    });

    // Handle reset button click
    resetButton.addEventListener('click', async () => {
        try {
            await fetch('/api/reset-game', { method: 'POST' });
        } catch (error) {
            console.error('Error resetting game:', error);
            alert('Error resetting game. Please try again.');
        }
    });

    // Start SSE connection
    const eventSource = setupSSE();
    
    // Clean up event source when page is unloaded
    window.addEventListener('beforeunload', () => {
        if (eventSource) {
            eventSource.close();
        }
    });
});
