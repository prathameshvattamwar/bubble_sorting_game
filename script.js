document.addEventListener('DOMContentLoaded', () => {
    const screens = {
        home: document.getElementById('home-screen'),
        game: document.getElementById('game-screen'),
    };
    const modals = {
        pause: document.getElementById('pause-modal'),
        win: document.getElementById('win-modal'),
        complete: document.getElementById('game-complete-modal'),
    };
    const ui = {
        level: document.getElementById('level'),
        moves: document.getElementById('moves'),
        timer: document.getElementById('timer'),
        winMoves: document.getElementById('win-moves'),
        winTime: document.getElementById('win-time'),
    };
    const buttons = {
        difficulty: document.querySelectorAll('.difficulty-btn'),
        start: document.getElementById('start-game-btn'),
        pause: document.getElementById('pause-btn'),
        exit: document.getElementById('exit-btn'),
        resume: document.getElementById('resume-btn'),
        exitModal: document.getElementById('exit-modal-btn'),
        nextLevel: document.getElementById('next-level-btn'),
        playAgain: document.getElementById('play-again-btn'),
    };
    const gameBoard = document.getElementById('game-board');
    const bgMusic = document.getElementById('bg-music');
    const moveSound = new Audio('assets/move-sound.wav');

    const TUBE_CAPACITY = 4;
    const levelConfigs = {
        easy:   [{ tubes: 5, colors: 3 }, { tubes: 6, colors: 4 }, { tubes: 7, colors: 5 }],
        medium: [{ tubes: 7, colors: 5 }, { tubes: 8, colors: 6 }, { tubes: 9, colors: 7 }],
        hard:   [{ tubes: 9, colors: 7 }, { tubes: 10, colors: 8 }, { tubes: 12, colors: 10 }]
    };

    let state = {};
    let timerInterval;
    let musicStarted = false;
    
    function resetState() {
        state = {
            difficulty: 'easy',
            currentLevel: 0,
            moves: 0,
            time: 0,
            isPaused: false,
            tubes: [],
            isDragging: false,
            draggedBall: null,
            fromTubeEl: null,
            fromTubeIndex: -1
        };
    }

    function switchScreen(screenName) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    function startMusic() {
        if (!musicStarted) {
            bgMusic.volume = 0.2;
            bgMusic.play().catch(() => {});
            musicStarted = true;
            document.body.removeEventListener('click', startMusic, true);
        }
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!state.isPaused) {
                state.time++;
                updateUI();
            }
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }
    
    function updateUI() {
        ui.level.textContent = state.currentLevel + 1;
        ui.moves.textContent = state.moves;
        ui.timer.textContent = formatTime(state.time);
    }

    function generateLevel() {
        state.moves = 0;
        state.time = 0;
        stopTimer();
        
        const config = levelConfigs[state.difficulty][state.currentLevel];
        const { tubes: numTubes, colors: numColors } = config;

        let balls = [];
        for (let i = 1; i <= numColors; i++) {
            for (let j = 0; j < TUBE_CAPACITY; j++) {
                balls.push(`color${i}`);
            }
        }
        balls = balls.sort(() => Math.random() - 0.5);

        state.tubes = Array.from({ length: numTubes }, (_, i) => 
            i < numColors ? balls.splice(0, TUBE_CAPACITY) : []
        );

        renderGameBoard();
        updateUI();
        startTimer();
    }
    
    function renderGameBoard() {
        gameBoard.innerHTML = '';
        state.tubes.forEach((tubeContent, index) => {
            const tubeEl = document.createElement('div');
            tubeEl.classList.add('tube');
            tubeEl.dataset.index = index;

            tubeContent.forEach(color => {
                const ballEl = document.createElement('div');
                ballEl.classList.add('ball', `ball-${color}`);
                tubeEl.appendChild(ballEl);
            });
            
            gameBoard.appendChild(tubeEl);
        });
    }

    function handleDragStart(e) {
        if (state.isPaused || state.isDragging) return;
        const tubeEl = e.target.closest('.tube');
        if (!tubeEl) return;
        
        const tubeIndex = parseInt(tubeEl.dataset.index);
        if (state.tubes[tubeIndex].length === 0) return;

        e.preventDefault();
        
        state.isDragging = true;
        state.fromTubeEl = tubeEl;
        state.fromTubeIndex = tubeIndex;

        const originalBall = tubeEl.lastElementChild;
        originalBall.classList.add('lifted');

        state.draggedBall = originalBall.cloneNode();
        state.draggedBall.classList.remove('lifted');
        state.draggedBall.classList.add('dragged');
        
        const ballSize = originalBall.offsetWidth;
        state.draggedBall.style.width = `${ballSize}px`;
        state.draggedBall.style.height = `${ballSize}px`;
        
        document.body.appendChild(state.draggedBall);

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        moveDraggedBall(clientX, clientY);

        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('touchmove', handleDragMove, { passive: false });
        document.addEventListener('mouseup', handleDragEnd);
        document.addEventListener('touchend', handleDragEnd);
    }
    
    function moveDraggedBall(x, y) {
        if (!state.draggedBall) return;
        state.draggedBall.style.left = `${x - state.draggedBall.offsetWidth / 2}px`;
        state.draggedBall.style.top = `${y - state.draggedBall.offsetHeight / 2}px`;
    }

    function handleDragMove(e) {
        if (!state.isDragging) return;
        e.preventDefault();
        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        moveDraggedBall(clientX, clientY);
    }

    function handleDragEnd(e) {
        if (!state.isDragging) return;
        
        const clientX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
        const clientY = e.type === 'touchend' ? e.changedTouches[0].clientY : e.clientY;

        const dropTarget = document.elementFromPoint(clientX, clientY)?.closest('.tube');
        let moveSuccessful = false;

        if (dropTarget) {
            const toTubeIndex = parseInt(dropTarget.dataset.index);
            if (isValidMove(state.fromTubeIndex, toTubeIndex)) {
                moveBall(state.fromTubeIndex, toTubeIndex);
                moveSuccessful = true;
            }
        }
        
        if (!moveSuccessful) {
            state.fromTubeEl.lastElementChild.classList.remove('lifted');
        }

        cleanupDrag();
    }
    
    function cleanupDrag() {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchend', handleDragEnd);
        
        state.draggedBall?.remove();
        state.isDragging = false;
        state.draggedBall = null;
        state.fromTubeEl = null;
        state.fromTubeIndex = -1;
    }

    function isValidMove(fromIndex, toIndex) {
        if (fromIndex === toIndex) return false;
        const fromTube = state.tubes[fromIndex];
        const toTube = state.tubes[toIndex];
        if (fromTube.length === 0) return false;
        if (toTube.length === TUBE_CAPACITY) return false;
        if (toTube.length === 0) return true;
        return fromTube[fromTube.length - 1] === toTube[toTube.length - 1];
    }
    
    function moveBall(fromIndex, toIndex) {
        const ball = state.tubes[fromIndex].pop();
        state.tubes[toIndex].push(ball);
        
        state.moves++;
        moveSound.play().catch(()=>{});
        renderGameBoard();
        updateUI();
        checkWinCondition();
    }

    function checkWinCondition() {
        const isWon = state.tubes.every(tube => 
            tube.length === 0 || (tube.length === TUBE_CAPACITY && new Set(tube).size === 1)
        );

        if (isWon) {
            stopTimer();
            setTimeout(() => {
                if (state.currentLevel < levelConfigs[state.difficulty].length - 1) {
                    ui.winMoves.textContent = state.moves;
                    ui.winTime.textContent = formatTime(state.time);
                    modals.win.classList.add('show');
                } else {
                    modals.complete.classList.add('show');
                }
            }, 500);
        }
    }

    function togglePause() {
        state.isPaused = !state.isPaused;
        modals.pause.classList.toggle('show', state.isPaused);
        buttons.pause.innerHTML = state.isPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        if (state.isPaused) bgMusic.pause();
        else if(musicStarted) bgMusic.play();
    }
    
    function exitToMenu() {
        stopTimer();
        bgMusic.pause();
        musicStarted = false;
        Object.values(modals).forEach(m => m.classList.remove('show'));
        switchScreen('home');
    }

    buttons.difficulty.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.difficulty.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.difficulty = btn.dataset.difficulty;
        });
    });

    buttons.start.addEventListener('click', () => {
        if (!state.difficulty) {
            const firstBtn = document.querySelector('.difficulty-btn');
            firstBtn.classList.add('selected');
            state.difficulty = firstBtn.dataset.difficulty;
        }
        resetState();
        state.difficulty = document.querySelector('.difficulty-btn.selected').dataset.difficulty;
        switchScreen('game');
        generateLevel();
        startMusic();
    });
    
    buttons.pause.addEventListener('click', togglePause);
    buttons.resume.addEventListener('click', togglePause);
    buttons.exit.addEventListener('click', exitToMenu);
    buttons.exitModal.addEventListener('click', exitToMenu);

    buttons.nextLevel.addEventListener('click', () => {
        modals.win.classList.remove('show');
        state.currentLevel++;
        generateLevel();
    });

    buttons.playAgain.addEventListener('click', () => {
        modals.complete.classList.remove('show');
        resetState();
        state.difficulty = 'easy';
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
        document.querySelector('.difficulty-btn[data-difficulty="easy"]').classList.add('selected');
        switchScreen('home');
    });

    gameBoard.addEventListener('mousedown', handleDragStart);
    gameBoard.addEventListener('touchstart', handleDragStart, { passive: false });
    document.body.addEventListener('click', startMusic, { once: true, capture: true });
    
    resetState();
    buttons.difficulty[0].classList.add('selected');
});