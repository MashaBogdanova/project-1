function initialize() {
    let rowCount = 10;
    let minesCount = 10;
    let modalOverlay = showModal(localStorage.getItem("prevResults") || "");

    const boardSizeSelect = document.getElementById("board-size-select");
    boardSizeSelect.addEventListener('change', () => {
        rowCount = Number(boardSizeSelect.value);
    });

    const minesNumberSelect = document.getElementById("mines-number-select");
    minesNumberSelect.addEventListener('change', () => {
        minesCount = Number(minesNumberSelect.value);
    });

    const startGameBtn = document.getElementById("start-board-btn");
    startGameBtn.addEventListener("click", () => {
        modalOverlay.remove();
        new Board(rowCount, minesCount);
        addSoundEffect("./assets/sounds/restart.mp3", true);
    })
}

// Create board class
class Board {
    constructor(rowCount, minesCount) {
        this.rowCount = rowCount;
        this.minesCount = minesCount;
        this.flaggedCells = minesCount;
        this.soundToggle = true;
        this.boardElement = this.createBoardElement();
        this.headerElement = this.createHeaderElement();
        this.board = this.createBoard();
        this.openedCellsCount = 0;
        this.loose = false;
        this.stepsCounter = 0;
        this.secondsCounter = 0;
        this.stopwatchInterval = null;
        this.closestCellsDirections = [
            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 0],
            [1, 1]
        ];
        this.touchStartTime = null;
        this.touchEndTime = null;
        this.screenWidth = screen.width;
        this.addEventListeners();
    }

    createBoardElement() {
        const boardElement = createElement("section", ["board"], document.body, "");
        const boardSize = this.getBoardElementSize();
        boardElement.setAttribute("style", `width: ${boardSize}vw; height: ${boardSize}vw;`);
        boardElement.setAttribute("unselectable", "on");
        return boardElement;
    }

    createBoard() {
        let board = [];
        for (let i = 0; i < this.rowCount; i++) {
            board.push([]);
            for (let j = 0; j < this.rowCount; j++) {
                const cell = new Cell(this, i, j);
                board[i].push(cell);
            }
        }
        return board;
    }

    createHeaderElement() {
        const headerElement = document.createElement("header");
        headerElement.classList.add("header");
        document.body.prepend(headerElement);

        // Title
        createElement("h1", ["header__title"], headerElement, "MINESWEEPER");

        // Sound
        const soundElement = createElement("article", ["header__sound"], headerElement);
        soundElement.addEventListener("click", () => {
            this.rerenderSoundElement(soundElement);
        })

        // Steps counter
        createElement("article", ["header__steps"], headerElement, "000");

        // New game button
        const newGameBtn = createElement("button", ["button"], headerElement, "New game");
        newGameBtn.setAttribute("id", "restart-btn");
        newGameBtn.addEventListener("click", () => {
            this.boardElement.remove();
            this.headerElement.remove();
            this.stopStopwatch();
            initialize();
            addSoundEffect("./assets/sounds/show-modal.mp3", this.soundToggle);
        });

        // Stopwatch and flags counter
        createElement("article", ["header__stopwatch"], headerElement, "000");
        createElement("article", ["header__flags-counter"], headerElement, this.showTwoDigitNumber(this.flaggedCells));

        return headerElement;
    }

    addEventListeners() {
        if (this.screenWidth >= 1024) {
            this.boardElement.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                this.flagClickedCell(e);
            });
        } else {
            this.boardElement.addEventListener("touchstart", this.setStartTime.bind(this));
            this.boardElement.addEventListener("touchend", this.setEndTime.bind(this));
        }
        this.boardElement.addEventListener("click", this.checkClickedCell.bind(this));
    }

    localizeMines(firstClickRow, firstClickCol) {
        for (let i = 0; i < this.minesCount; i++) {
            const randomNumber = Math.floor(Math.random() * (this.rowCount * this.rowCount));
            const rowIndex = Math.floor(randomNumber / this.rowCount);
            const colIndex = randomNumber % this.rowCount;

            // Check if first users click is on the mined cell or if the cell is already mined
            this.board[rowIndex][colIndex] === this.board[firstClickRow][firstClickCol]
            || this.board[rowIndex][colIndex].mine
                ? i--
                : this.board[rowIndex][colIndex].mine = true;
        }
    }

    rerenderStepsCounter() {
        this.stepsCounter += 1;
        document.querySelector(".header__steps").innerText = this.showThreeDigitNumber(this.stepsCounter);
    }

    rerenderFlagsCounter() {
        this.flaggedCells -= 1;
        document.querySelector(".header__flags-counter").innerText = this.showTwoDigitNumber(this.flaggedCells);
    }

    rerenderSoundElement(soundElement) {
        this.soundToggle = !this.soundToggle;
        soundElement.classList.toggle("header__sound_off");
    }

    startStopwatch() {
        this.stopwatchInterval = setInterval(() => {
            this.secondsCounter += 1;
            document.querySelector(".header__stopwatch").innerText = this.showThreeDigitNumber(this.secondsCounter);
        }, 1000);
    }

    stopStopwatch() {
        clearInterval(this.stopwatchInterval);
    }

    checkClickedCell(e) {
        if (e.target.matches(".board")) {
            console.warn("Press the cell");
        } else {
            if (this.touchEndTime - this.touchStartTime >= 500) {
                e.preventDefault();
                this.flagClickedCell(e);
            } else if (!e.target.matches(".cell_flagged")) {
                const row = Number(e.target.id.split("-")[0]);
                const column = Number(e.target.id.split("-")[1]);
                const chosenCell = this.board[row][column];

                if (this.stepsCounter === 0) {
                    this.startStopwatch();
                    this.localizeMines(row, column);
                }

                if (chosenCell.mine) {
                    this.loose = true;
                    chosenCell.opened = true;
                    this.openedCellsCount += 1;

                    chosenCell.cellElement.classList.add("cell_mined");
                    addSoundEffect("./assets/sounds/explosion.mp3", this.soundToggle);
                    const cells = this.boardElement.children;
                    for (const cell of cells) {
                        cell.setAttribute("disabled", "true");
                    }
                    setTimeout(() => {
                        this.endTheGame(false);
                    }, 1000);

                } else {
                    this.openAndCheckNeighbours(row, column, chosenCell);
                    addSoundEffect("./assets/sounds/open-cell.mp3", this.soundToggle);
                }
                this.rerenderStepsCounter();
                this.openedCellsCount === Math.pow(this.rowCount, 2) - this.minesCount
                && this.loose === false
                && this.endTheGame(true);
            }

        }
    }

    openAndCheckNeighbours(row, column, chosenCell) {
        chosenCell.cellElement.classList.add("cell_opened");
        chosenCell.opened = true;
        this.openedCellsCount += 1;

        const counter = this.countMinedNeighbours(row, column);

        if (counter === 0) {
            this.checkNeighbours(row, column);
        } else {
            const currentCell = this.board[row][column].cellElement;
            currentCell.innerHTML = `<p>${counter}</p>`;
            if (counter === 1) {
                currentCell.classList.add("cell_1mine");
            } else if (counter === 2) {
                currentCell.classList.add("cell_2mines");
            } else if (counter === 3) {
                currentCell.classList.add("cell_3mines");
            } else if (counter === 4) {
                currentCell.classList.add("cell_4mines");
            } else if (counter === 5) {
                currentCell.classList.add("cell_5mines");
            } else if (counter === 6) {
                currentCell.classList.add("cell_6mines");
            } else if (counter === 7) {
                currentCell.classList.add("cell_7mines");
            } else if (counter === 8) {
                currentCell.classList.add("cell_8mines");
            }
        }
    }

    countMinedNeighbours(row, column) {
        let counter = 0;

        for (let direction of this.closestCellsDirections) {
            const rowNumber = row + direction[0];
            const colNumber = column + direction[1];

            if (rowNumber >= 0 && colNumber >= 0 && rowNumber <= this.rowCount - 1
                && colNumber <= this.rowCount - 1 && this.board[rowNumber][colNumber].mine) {
                counter += 1;
            }
        }
        return counter;
    }

    checkNeighbours(row, column) {
        for (const direction of this.closestCellsDirections) {
            const rowNumber = row + direction[0];
            const colNumber = column + direction[1];

            if (rowNumber >= 0 && colNumber >= 0 && rowNumber <= this.rowCount - 1 && colNumber <= this.rowCount - 1
                && !this.board[rowNumber][colNumber].opened) {
                this.openAndCheckNeighbours(rowNumber, colNumber, this.board[rowNumber][colNumber]);
            }
        }
    }

    flagClickedCell = e => {
        const row = e.target.id.split("-")[0];
        const column = e.target.id.split("-")[1];
        const chosenCell = this.board[row][column];

        this.rerenderFlagsCounter();

        if (chosenCell.flagged) {
            chosenCell.cellElement.classList.remove("cell_flagged");
            chosenCell.flagged = false;
        } else {
            chosenCell.cellElement.classList.remove("cell_opened");
            chosenCell.cellElement.classList.add("cell_flagged");
            chosenCell.flagged = true;
        }
        addSoundEffect("./assets/sounds/flag.mp3", this.soundToggle);
    }

    setStartTime(e) {
        this.touchStartTime = e.timeStamp;
    }

    setEndTime(e) {
        this.touchEndTime = e.timeStamp;
    }

    endTheGame(win) {
        this.boardElement.remove();
        this.headerElement.remove();
        this.stopStopwatch();

        if (win) {
            const text = `You found all mines in ${this.secondsCounter} ${this.secondsCounter === 1 ? "second" : "seconds"}
            and ${this.stepsCounter} ${this.stepsCounter === 1 ? "move" : "moves"}!`
            const prevResults = this.updatePrevResults(text);
            showModal(prevResults, false, "HOORAY!", `${text}`);
            addSoundEffect("./assets/sounds/win.mp3", this.soundToggle);
        } else {
            const prevResults = this.updatePrevResults("You lose");
            showModal(prevResults, false, "GAME OVER!", "Try again");
            addSoundEffect("./assets/sounds/game-over.mp3", this.soundToggle);
        }

        document.getElementById("start-board-btn").addEventListener("click", () => {
            document.querySelector(".modal__overlay").remove();
            initialize();
            addSoundEffect("./assets/sounds/show-modal.mp3", this.soundToggle);
        });
    }

    updatePrevResults(result) {
        let prevResults;
        if (localStorage.getItem("prevResults") === null) {
            prevResults = result;
        } else {
            prevResults = localStorage.getItem("prevResults").split(",");

            if (prevResults[0] === "initial value" || prevResults.length === 10) {
                prevResults.shift();
            }

            prevResults.push(result);
            prevResults = prevResults.join();
        }

        localStorage.setItem("prevResults", prevResults);
        return prevResults;
    }

    showTwoDigitNumber(num) {
        if (num < 0) {
            return `${num}`;
        } else if (num < 10) {
            return `0${num}`;
        } else {
            return `${num}`;
        }
    }

    showThreeDigitNumber(num) {
        if (num < 10) {
            return `00${num}`;
        } else if (num < 100) {
            return `0${num}`;
        } else {
            return `${num}`;
        }
    }

    getBoardElementSize() {
        let boardSize;
        if (screen.width > 912) {
            boardSize = this.rowCount === 10 ? 30 : this.rowCount === 15 ? 45 : 75;
        } else if (screen.width > 414) {
            boardSize = this.rowCount === 10 ? 75 : 95;
        } else {
            boardSize = 95;
        }
        return boardSize;
    }
}

// Create cell class
class Cell {
    constructor(board, row, column) {
        this.opened = false;
        this.mine = false;
        this.flagged = false;
        this.id = `${row}-${column}`;
        this.board = board;
        this.cellElement = this.createCell();
    }

    createCell() {
        const cell = createElement("button", ["cell"], this.board.boardElement);
        const cellSize = 100 / this.board.rowCount;
        cell.setAttribute("style", `flex-basis: ${cellSize}%; height: ${cellSize}%;`);
        cell.setAttribute("id", this.id);
        cell.setAttribute("unselectable", "on");
        return cell;
    }
}

function showModal(prevResults, start = true, title = "Welcome to minesweeper", paragraph = "Choose board size and number of mines") {
    const modalOverlay = createElement("div", ["modal__overlay"], document.body);
    const welcomeModal = createElement("div", ["modal"], modalOverlay);

    createElement("h2", ["modal__title"], welcomeModal, title);
    createElement("h3", ["modal__paragraph"], welcomeModal, paragraph);

    if (start) {
        // Create board size and mines number elements
        const fieldset = createElement("fieldset", ["modal__fieldset"], welcomeModal);

        const boardSizeSelect = createElement("select", ["select"], fieldset);
        boardSizeSelect.setAttribute("id", "board-size-select");
        createElement("option", ["select__option"], boardSizeSelect, "10 x 10", 10);
        createElement("option", ["select__option"], boardSizeSelect, "15 x 15", 15);
        createElement("option", ["select__option"], boardSizeSelect, "25 x 25", 25);

        const minesNumberSelect = createElement("select", ["select"], fieldset);
        minesNumberSelect.setAttribute("id", "mines-number-select");
        for (let i = 10; i <= 99; i++) {
            createElement("option", ["select__option"], minesNumberSelect, `${i} mines`, i);
        }

        // Create previous results element
        prevResults = prevResults.split(",").reverse();

        const prevResultsElement = createElement("select", ["select", "select_prev-results"], welcomeModal);
        prevResultsElement.setAttribute("id", "prev-results");

        const option = createElement("option", ["select-option"], prevResultsElement, "Show previous results", "");
        option.setAttribute("disabled", "true");

        prevResults.map(result => {
            const option = createElement("option", ["select-option"], prevResultsElement, `${result}`);
            option.setAttribute("disabled", "true");
        })
    }

    const startGameBtn = createElement("button", ["button"], welcomeModal, "Play");
    startGameBtn.setAttribute("id", "start-board-btn");

    return modalOverlay;
}
function createElement(elemType, styles, parent, text, value) {
    const elem = document.createElement(elemType);
    elem.classList.add(...styles);
    parent.append(elem);
    if (text) {
        elem.innerText = text;
    }
    value && elem.setAttribute("value", value);
    return elem;
}
function addSoundEffect(path, soundToggle) {
    if (soundToggle) {
        const audio = new Audio(path);
        audio.play();
    }
}

initialize();