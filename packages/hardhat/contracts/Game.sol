// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

enum MoveDirection {
    Up,
    Down,
    Left,
    Right
}

// abstract contract LoogieCoinContract {
//   function mint(address to, uint256 amount) virtual public;
// }

abstract contract LoogiesContract {
    function tokenURI(uint256 id) external view virtual returns (string memory);

    function ownerOf(uint256 id) external view virtual returns (address);
}

contract Game is Ownable {
    event Restart(uint8 width, uint8 height, address winner);
    event Register(
        address indexed txOrigin,
        address indexed msgSender,
        uint8 x,
        uint8 y,
        uint256 loogieId,
        bool gameOn
    );
    event Move(
        address indexed txOrigin,
        uint8 x,
        uint8 y,
        uint256 health,
        uint256 gameTicker
    );
    event NewCurseDrop(
        Position[] cursePositions,
        uint8 curseDropCount,
        uint256 nextCurse,
        uint256 gameTicker
    );
    event NewHealthDrop(
        uint256 amount,
        uint8 dropX,
        uint8 dropY,
        uint8 oldX,
        uint8 oldY,
        uint256 gameTicker
    );
    event GameOver(address indexed player, uint256 gameTicker); // TODO: emmit winner, mint POAP to loogie owner

    struct Field {
        address player;
        bool cursed;
        uint256 healthAmountToCollect;
    }

    struct Position {
        uint8 x;
        uint8 y;
    }

    LoogiesContract public loogiesContract;

    bool public gameOn = false;
    uint256 public gameTicker;
    uint8 public gameId = 1; // TODO: counter? allow multiple games?
    uint8 public curseDuration = 10;
    uint8 public curseDropCount = 0;
    uint256 public nextCurse;
    uint8 public constant width = 7;
    uint8 public constant height = 7;
    uint8 public constant curseDropMax =
        (width / 2) % 1 == 0 ? width / 2 : width / 2 + 1;
    Position public centerPosition;

    Field[width][height] public worldMatrix;

    uint256 public actionInterval = 1; // block.timestamp is in UNIX seconds
    // uint256 public actionInterval = 60; // 1 minute, block.timestamp is in UNIX seconds

    // spanwPoints on corners
    Position[4] public spawnPoints;
    mapping(uint8 => Position[]) public worldMatrixRings;
    // mapping(uint8 => mapping(uint8 => Position)) public worldMatrixRings;
    mapping(address => address) public yourContract;
    mapping(address => Position) public yourPosition;
    mapping(address => uint256) public health;
    mapping(address => uint256) public lastActionTick;
    mapping(address => uint256) public lastActionTime;
    mapping(address => uint256) public lastActionBlock;
    mapping(address => uint256) public loogies;
    address[] public players;

    uint256 public restartBlockNumber;
    uint256 public tickerBlock;
    bool public dropOnCollect = true;
    uint8 public attritionDivider = 10;

    constructor(address _loogiesContractAddress) {
        loogiesContract = LoogiesContract(_loogiesContractAddress);

        // set spawn points
        for (uint8 i = 0; i < 4; i++) {
            spawnPoints[i].x = i % 2 == 0 ? 0 : width - 1;
            spawnPoints[i].y = i < 2 ? 0 : height - 1;
        }

        // set center position
        centerPosition = Position(
            ((width / 2) % 1 == 0 ? width / 2 : width / 2 + 1),
            ((height / 2) % 1 == 0 ? height / 2 : height / 2 + 1)
        );

        setWorldMatrixRings();

        restart(address(0));
    }

    function setWorldMatrixRings() internal {
        for (uint8 i = 0; i < curseDropMax; i++) {
            bool ix = true;
            bool iy = false;
            bool dy = false;
            bool dx = false;
            // ring lenght, equal to the sum of all field in ring
            uint8 y = i;
            uint8 x = i;
            uint8 side = 0;
            // total field in ring
            uint8 fields = (width - 1 - i) * 4 - (i * 4);
            for (uint8 j = 0; j < fields; j++) {
                // set fields into the 4 sides of the matrix for i-th ring
                // uint8 side = j != 0 ? j % (width - i) : 1;
                uint8 corner = j % (fields / 4);

                console.log("%s %s %s", x, y, j);
                console.log("i %s corner %s", i, corner);
                // console.log("dx %s dy %s", dx, dy);

                if (corner == 0) {
                    // x = i;
                    // y = i;

                    if (side == 1) {
                        iy = true;
                        ix = false;
                    } else if (side == 2) {
                        iy = false;
                        dx = true;
                    } else if (side == 3) {
                        dx = false;
                        dy = true;
                    } else if (side == 4) {
                        dy = false;
                        ix = true;
                    }

                    side++;
                }

                worldMatrixRings[i].push(Position(x, y));

                if (ix) {
                    x++;
                }

                if (iy) {
                    y++;
                }

                if (dx) {
                    x--;
                }

                if (dy) {
                    y--;
                }
            }
            console.log("--");
        }
    }

    function setDropOnCollect(bool _dropOnCollect) public onlyOwner {
        dropOnCollect = _dropOnCollect;
    }

    function restart(address winner) internal {
        // TODO: increase gameId, or create a new game?
        gameOn = false;
        gameTicker = 0;
        curseDropCount = 0;
        restartBlockNumber = block.number;
        tickerBlock = block.number;
        nextCurse = gameTicker + curseDuration;

        // reset world matrix
        for (uint256 i = 0; i < players.length; i++) {
            yourContract[players[i]] = address(0);
            Position memory playerPosition = yourPosition[players[i]];
            worldMatrix[playerPosition.x][playerPosition.y] = Field(
                address(0),
                false,
                0
            );
            yourPosition[players[i]] = Position(0, 0);
            health[players[i]] = 0;
            lastActionTick[players[i]] = 0;
            lastActionTime[players[i]] = 0;
            lastActionBlock[players[i]] = 0;
            loogies[players[i]] = 0;
        }

        delete players;

        emit Restart(width, height, winner);
    }

    function getBlockNumber() public view returns (uint256) {
        return block.number;
    }

    function getWorldMatrixRingsCount(uint8 ringIndex)
        public
        view
        returns (uint256)
    {
        return worldMatrixRings[ringIndex].length;
    }

    function getWorldMatrixRingsByIndeAtPositions(
        uint8 ringIndex,
        uint256 index
    ) public view returns (Position memory) {
        return worldMatrixRings[ringIndex][index];
    }

    function getWorldMatrixRingsByIndex(uint8 ringIndex)
        public
        view
        returns (Position[] memory)
    {
        return worldMatrixRings[ringIndex];
    }

    function update(address newContract) public {
        // require(gameOn, "NOT PLAYING");
        // require(tx.origin == msg.sender, "MUST BE AN EOA");
        // require(yourContract[tx.origin] != address(0), "MUST HAVE A CONTRACT");
        health[tx.origin] = (health[tx.origin] * 80) / 100; //20% loss of health on contract update?!!? lol
        yourContract[tx.origin] = newContract;
    }

    function register(uint256 loogieId) public {
        require(gameOn != true, "TOO LATE, GAME IS ALREADY STARTED");
        require(yourContract[tx.origin] == address(0), "Already registered");
        require(
            loogiesContract.ownerOf(loogieId) == tx.origin,
            "ONLY LOOGIES THAT YOU OWN"
        );
        require(players.length <= 3, "MAX 4 LOOGIES REACHED");

        players.push(tx.origin);
        yourContract[tx.origin] = msg.sender;
        health[tx.origin] = 100;
        loogies[tx.origin] = loogieId;

        // set initial player position
        Position memory playerPosition = Position(
            spawnPoints[players.length - 1].x,
            spawnPoints[players.length - 1].y
        );
        yourPosition[tx.origin] = playerPosition;

        // Place player on the worldmatrix
        worldMatrix[playerPosition.x][playerPosition.y].player = tx.origin;

        // check if all players are registered, if so start the game
        if (players.length == 4) {
            gameOn = true;
        }

        emit Register(
            tx.origin,
            msg.sender,
            playerPosition.x,
            playerPosition.y,
            loogieId,
            gameOn
        );

        // drop initial health
        if (gameOn) {
            dropHealth(100);
        }
    }

    function currentPosition() public view returns (Position memory) {
        return yourPosition[tx.origin];
    }

    function isCursedByPlayer(address player) public view returns (bool) {
        return
            worldMatrix[yourPosition[player].x][yourPosition[player].y].cursed;
    }

    function isCursed(uint8 x, uint8 y) public view returns (bool) {
        return worldMatrix[x][y].cursed;
    }

    function helathAmmount(uint8 x, uint8 y) public view returns (uint256) {
        return worldMatrix[x][y].healthAmountToCollect;
    }

    function positionOf(address player) public view returns (Position memory) {
        return yourPosition[player];
    }

    function tokenURIOf(address player) public view returns (string memory) {
        // require (yourContract[player] != address(0), "MUST HAVE A CONTRACT");

        // if loogie dead add gray filter

        // if game on add sword to the URI
        return loogiesContract.tokenURI(loogies[player]);
    }

    function collectHealth(uint8 x, uint8 y) internal {
        require(health[tx.origin] > 0, "YOU DED");

        // Position memory position = yourPosition[tx.origin];
        Field memory field = worldMatrix[x][y];
        require(field.healthAmountToCollect > 0, "NOTHING TO COLLECT");

        // increase health
        uint256 amount = field.healthAmountToCollect;
        health[tx.origin] += amount;
        worldMatrix[x][y].healthAmountToCollect = 0;

        if (dropOnCollect) {
            dropHealth(amount);
        }
    }

    function setAttritionDivider(uint8 newDivider) public onlyOwner {
        attritionDivider = newDivider;
    }

    function move(MoveDirection direction) public {
        require(gameOn, "NOT PLAYING");
        (uint8 x, uint8 y) = getCoordinates(direction, tx.origin);

        moveToCoord(x, y);
    }

    function moveToCoord(uint8 x, uint8 y) public {
        Position memory position = yourPosition[tx.origin];
        require(health[tx.origin] > 0, "YOU ARE DEAD");
        require(
            health[tx.origin] > attritionDivider,
            "NOT ENOUGH HEALTH TO MOVE"
        );
        require(x < width && y < height, "OUT OF BOUNDS");
        require(
            worldMatrix[position.x][position.y].cursed == false,
            "CURSED, CANT MOVE"
        );

        require(
            block.timestamp - lastActionTime[tx.origin] >= actionInterval,
            "TOO EARLY TIME"
        );

        // require(gameTicker > lastActionTick[tx.origin], "TOO EARLY TICKER");

        Field memory field = worldMatrix[x][y];

        require(
            field.player == address(0) ||
                (field.player != address(0) && health[field.player] > 0),
            "A DEAD LOOGIE ON THIS POSITION"
        );

        // handle custom game logic like cursed fields
        runGameTicker();

        // reduce health if field is cursed
        if (worldMatrix[position.x][position.y].cursed) {
            health[tx.origin] = 0;
        }

        // reduce health when move
        health[tx.origin] -= attritionDivider;
        if (health[tx.origin] < 0) {
            health[tx.origin] = 0;
        }

        if (field.player == address(0)) {
            // just move to the new position
            worldMatrix[position.x][position.y].player = address(0);
            worldMatrix[x][y].player = tx.origin;
            yourPosition[tx.origin] = Position(x, y);

            if (field.healthAmountToCollect > 0) {
                collectHealth(x, y);
            }

            emit Move(tx.origin, x, y, health[tx.origin], gameTicker);
        } else {
            // keep loogies on same field place and fight!
            if (field.player != address(0)) {
                //  fight the winner steals 50% of health
                console.log("ANOTHER LOOGIE ON THIS POSITION, FIGHT!");

                uint256 healthToSteal = health[field.player] / 2;
                uint256 healthToLose = health[tx.origin] / 2;

                // with the same health amount, the caller will win
                if (health[tx.origin] >= health[field.player]) {
                    // tx.origin wins
                    health[tx.origin] += healthToSteal;
                    health[field.player] = 0;
                } else {
                    // field.player wins
                    health[field.player] += healthToLose;
                    health[tx.origin] = 0;
                }

                // emmit the fight move event for the player on this field
                emit Move(field.player, x, y, health[field.player], gameTicker);
                emit Move(
                    tx.origin,
                    position.x,
                    position.y,
                    health[tx.origin],
                    gameTicker
                );
            }
        }
    }

    // TODO: change to only owner function and transfer the ownership to the new owner
    function runManualTicker() public {
        require(gameOn, "NOT PLAYING");
        runGameTicker();
    }

    function getCoordinates(MoveDirection direction, address txOrigin)
        internal
        view
        returns (uint8 x, uint8 y)
    {
        //       x ----->
        //      _______________
        //  y  |____|____|_____
        //     |____|____|_____
        //     |____|____|_____
        //     |____|____|_____

        if (direction == MoveDirection.Up) {
            x = yourPosition[txOrigin].x;
            y = yourPosition[txOrigin].y - 1;
        }

        if (direction == MoveDirection.Down) {
            x = yourPosition[txOrigin].x;
            y = yourPosition[txOrigin].y + 1;
        }

        if (direction == MoveDirection.Left) {
            x = yourPosition[txOrigin].x - 1;
            y = yourPosition[txOrigin].y;
        }

        if (direction == MoveDirection.Right) {
            x = yourPosition[txOrigin].x + 1;
            y = yourPosition[txOrigin].y;
        }
    }

    function dropHealth(uint256 amount) internal {
        bytes32 predictableRandom = keccak256(
            abi.encodePacked(
                blockhash(block.number - 1),
                msg.sender,
                // tx.origin,
                address(this)
            )
        );

        uint8 index = 0;
        uint8 x = uint8(predictableRandom[index++]) % width;
        uint8 y = uint8(predictableRandom[index++]) % height;

        Field memory field = worldMatrix[x][y];

        while (field.player != address(0)) {
            x = uint8(predictableRandom[index++]) % width;
            y = uint8(predictableRandom[index++]) % height;
            field = worldMatrix[x][y];
        }

        field.healthAmountToCollect += amount;

        Position memory position = yourPosition[tx.origin];

        runGameTicker();

        emit NewHealthDrop(amount, x, y, position.x, position.y, gameTicker);
    }

    function runGameTicker() internal {
        console.log("RUNNING GAME TICKER");
        gameTicker = gameTicker + 1;
        lastActionTick[tx.origin] = gameTicker;
        lastActionTime[tx.origin] = block.timestamp;
        lastActionBlock[tx.origin] = block.number;
        tickerBlock = block.number;

        // check if we need to drop a curse
        if (gameTicker == nextCurse) {
            dropCurse();
        }

        // check if game is over by checking players health, if so restart()
        address winner = address(0);
        uint8 playersAlive = 0;
        for (uint256 i = 0; i < players.length; i++) {
            Position memory playerPosition = yourPosition[players[i]];
            console.log(
                "-- PLAYER: %s POSITION: %s  %s",
                players[i],
                playerPosition.x,
                playerPosition.y
            );

            console.log(
                "HEALTH: %s CURSED: %s ",
                health[players[i]],
                worldMatrix[playerPosition.x][playerPosition.y].cursed
            );

            if (
                health[players[i]] > 0 &&
                worldMatrix[playerPosition.x][playerPosition.y].cursed == false
            ) {
                // player is alive and not cursed, continue
                playersAlive++;
                winner = players[i];
                // continue;
            }
        }

        if (playersAlive == 0) {
            console.log("ALL PLAYERS ARE DEAD, RESTARTING THE GAME");
            gameOn = false;
            // restart(address(0));
        } else if (playersAlive == 1) {
            console.log("WE HAVE A WINNER %s, TODO: MINT POAP", winner);
            gameOn = false;
            // restart(winner);
        } else {
            console.log("NOTHING TO DO");
        }
    }

    function dropCurse() public {
        require(gameOn, "NOT PLAYING");
        require(curseDropCount < curseDropMax, "TOO MANY CURSE DROPS");

        nextCurse = gameTicker + curseDuration;

        console.log(
            "curseDropMax %s curseDropCount %s",
            curseDropMax,
            curseDropCount
        );

        for (uint8 i = 0; i < worldMatrixRings[curseDropCount].length; i++) {
            uint8 x = worldMatrixRings[curseDropCount][i].x;
            uint8 y = worldMatrixRings[curseDropCount][i].y;
            console.log("CURSE DROPPED ON %s,%s RING %s", x, y, curseDropCount);

            // check for player, if so kill player and drop his health
            Field memory field = worldMatrix[x][y];
            worldMatrix[x][y] = Field(field.player, true, 0);

            if (field.player != address(0)) {
                if (health[field.player] > 0) {
                    console.log("CURSE DROPPED ON PLAYER %s", field.player);
                    health[field.player] = 0;
                    // emit Move(
                    //     field.player,
                    //     x,
                    //     y,
                    //     health[field.player],
                    //     gameTicker
                    // );
                }
            }
        }

        emit NewCurseDrop(
            worldMatrixRings[curseDropCount],
            curseDropCount,
            nextCurse,
            gameTicker
        );

        curseDropCount++;
    }
}
