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
    event Restart(uint8 width, uint8 height, uint256 nextCurseBlockNumber);
    event Register(
        address indexed txOrigin,
        address indexed msgSender,
        uint8 x,
        uint8 y,
        uint256 loogieId
    );
    event Move(address indexed txOrigin, uint8 x, uint8 y, uint256 health);
    event NewCurse(uint256 nextCurseBlockNumber);
    event NewHealthDrop(uint256 amount, uint8 x, uint8 y);
    event CollectedHealth(address indexed player, uint256 amount);
    // TODO: emmit winner, mint poap
    event GameOver(address indexed player);

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
    uint8 public gameId = 1;
    uint8 public curseBlocksDuration = 10;

    uint8 public constant width = 6;
    uint8 public constant height = 6;
    Field[width][height] public worldMatrix;

    // spanwPoints on corners
    uint8 public constant spawnPointsCount = 4;
    Position[spawnPointsCount] public spawnPoints;

    mapping(address => address) public yourContract;
    mapping(address => Position) public yourPosition;
    mapping(address => uint256) public health;
    mapping(address => uint256) public lastAction;
    mapping(address => uint256) public loogies;
    address[] public players;

    uint256 public restartBlockNumber;
    uint256 public nextCurseBlockNumber;
    bool public dropOnCollect;
    uint8 public attritionDivider = 10;

    constructor(address _loogiesContractAddress) {
        loogiesContract = LoogiesContract(_loogiesContractAddress);

        // set spawn points
        for (uint8 i = 0; i < spawnPointsCount; i++) {
            spawnPoints[i].x = i % 2 == 0 ? 0 : width - 1;
            spawnPoints[i].y = i < 2 ? 0 : height - 1;
        }

        nextCurseBlockNumber = block.number + curseBlocksDuration;

        emit Restart(width, height, nextCurseBlockNumber);
    }

    function setDropOnCollect(bool _dropOnCollect) public onlyOwner {
        dropOnCollect = _dropOnCollect;
    }

    function start() public onlyOwner {
        gameOn = true;
    }

    function end() public onlyOwner {
        gameOn = false;
    }

    function restart() public onlyOwner {
        // TODO: increase gameId

        for (uint256 i = 0; i < players.length; i++) {
            yourContract[players[i]] = address(0);

            console.log("restart");

            Position memory playerPosition = yourPosition[players[i]];
            worldMatrix[playerPosition.x][playerPosition.y] = Field(
                address(0),
                false,
                0
            );
            yourPosition[players[i]] = Position(0, 0);
            health[players[i]] = 0;
            lastAction[players[i]] = 0;
            loogies[players[i]] = 0;
        }

        delete players;

        restartBlockNumber = block.number;
        nextCurseBlockNumber = restartBlockNumber + 10;

        start();

        emit Restart(width, height, nextCurseBlockNumber);
    }

    function getPlayers() public view returns (address[] memory) {
        return players;
    }

    function update(address newContract) public {
        // require(gameOn, "TOO LATE");
        // require(tx.origin == msg.sender, "MUST BE AN EOA");
        // require(yourContract[tx.origin] != address(0), "MUST HAVE A CONTRACT");
        health[tx.origin] = (health[tx.origin] * 80) / 100; //20% loss of health on contract update?!!? lol
        yourContract[tx.origin] = newContract;
    }

    bool public requireContract = false;

    function setRequireContract(bool newValue) public onlyOwner {
        requireContract = newValue;
    }

    function register(uint256 loogieId) public {
        require(gameOn, "TOO LATE");
        if (requireContract) require(tx.origin != msg.sender, "NOT A CONTRACT");
        require(yourContract[tx.origin] == address(0), "Already registered");
        require(
            loogiesContract.ownerOf(loogieId) == tx.origin,
            "ONLY LOOGIES THAT YOU OWN"
        );
        require(players.length <= 4, "MAX 4 LOOGIES REACHED");

        players.push(tx.origin);
        yourContract[tx.origin] = msg.sender;
        health[tx.origin] = 100;
        loogies[tx.origin] = loogieId;

        // Place loogie on the board, on a random corner
        worldMatrix[0][0] = Field(tx.origin, false, 0);

        // random number between 0 and spawnPointsCount
        bytes32 predictableRandom = keccak256(
            abi.encodePacked(
                blockhash(block.number - 1),
                msg.sender,
                tx.origin,
                address(this)
            )
        );

        uint8 randomSpawnPoint = uint8(predictableRandom[0]) % spawnPointsCount;

        Position memory spawnPoint = spawnPoints[randomSpawnPoint];

        Field memory field = worldMatrix[spawnPoint.x][spawnPoint.y];
        while (field.player != address(0)) {
            randomSpawnPoint = (randomSpawnPoint + 1) % spawnPointsCount;
            spawnPoint = spawnPoints[randomSpawnPoint];
        }

        moveToCoord(spawnPoint.x, spawnPoint.y);

        // drop health on the board
        dropHealth(10);

        emit Register(
            tx.origin,
            msg.sender,
            yourPosition[tx.origin].x,
            yourPosition[tx.origin].y,
            loogieId
        );
    }

    function randomlyPlace() internal {
        bytes32 predictableRandom = keccak256(
            abi.encodePacked(
                blockhash(block.number - 1),
                msg.sender,
                tx.origin,
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

        worldMatrix[x][y].player = tx.origin;
        worldMatrix[yourPosition[tx.origin].x][yourPosition[tx.origin].y]
            .player = address(0);
        yourPosition[tx.origin] = Position(x, y);
        //emit Move(tx.origin, x, y);
    }

    function currentPosition() public view returns (Position memory) {
        return yourPosition[tx.origin];
    }

    function positionOf(address player) public view returns (Position memory) {
        return yourPosition[player];
    }

    function tokenURIOf(address player) public view returns (string memory) {
        return loogiesContract.tokenURI(loogies[player]);
    }

    function collectHealth() internal {
        require(health[tx.origin] > 0, "YOU DED");

        Position memory position = yourPosition[tx.origin];
        Field memory field = worldMatrix[position.x][position.y];
        require(field.healthAmountToCollect > 0, "NOTHING TO COLLECT");

        uint256 amount = field.healthAmountToCollect;
        // increase health
        health[tx.origin] += amount;
        worldMatrix[position.x][position.y].healthAmountToCollect = 0;

        emit CollectedHealth(tx.origin, amount);

        if (dropOnCollect) {
            dropHealth(amount);
        }
    }

    function setAttritionDivider(uint8 newDivider) public onlyOwner {
        attritionDivider = newDivider;
    }

    function move(MoveDirection direction) public {
        if (requireContract) require(tx.origin != msg.sender, "NOT A CONTRACT");
        (uint8 x, uint8 y) = getCoordinates(direction, tx.origin);

        moveToCoord(x, y);
    }

    function moveToCoord(uint8 x, uint8 y) public {
        require(health[tx.origin] > 0, "YOU DED");
        require(x < width && y < height, "OUT OF BOUNDS");
        require(
            worldMatrix[yourPosition[tx.origin].x][yourPosition[tx.origin].y]
                .cursed == false,
            "YOU ARE CURSED"
        );
        require(lastAction[tx.origin] < block.number, "TOO EARLY");
        lastAction[tx.origin] = block.number;

        // if (requireContract) require(tx.origin != msg.sender, "NOT A CONTRACT");

        Field memory field = worldMatrix[x][y];

        require(field.player == address(0), "ANOTHER LOOGIE ON THIS POSITION");
        bytes32 predictableRandom = keccak256(
            abi.encodePacked(
                blockhash(block.number - 1),
                msg.sender,
                address(this)
            )
        );

        worldMatrix[x][y].player = tx.origin;
        worldMatrix[yourPosition[tx.origin].x][yourPosition[tx.origin].y]
            .player = address(0);
        yourPosition[tx.origin] = Position(x, y);

        if (field.healthAmountToCollect > 0) {
            collectHealth();
        }

        // reduce health when move
        health[tx.origin] -= uint8(predictableRandom[0]) / attritionDivider;

        if (health[tx.origin] <= 0) {
            health[tx.origin] = 0;
        }

        // reduce health if you are cursed
        if (
            worldMatrix[yourPosition[tx.origin].x][yourPosition[tx.origin].y]
                .cursed
        ) {
            health[tx.origin] -= 10;
        }

        emit Move(tx.origin, x, y, health[tx.origin]);
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
                address(this)
            )
        );

        uint8 x = uint8(predictableRandom[0]) % width;
        uint8 y = uint8(predictableRandom[1]) % height;

        worldMatrix[x][y].healthAmountToCollect += amount;
        emit NewHealthDrop(amount, x, y);
    }

    function dropCurse() public onlyOwner {
        bytes32 predictableRandom = keccak256(
            abi.encodePacked(
                blockhash(block.number - 1),
                msg.sender,
                address(this)
            )
        );

        uint8 x = uint8(predictableRandom[0]) % width;
        uint8 y = uint8(predictableRandom[1]) % height;

        worldMatrix[x][y].cursed = true;

        nextCurseBlockNumber = block.number + curseBlocksDuration;

        emit NewCurse(nextCurseBlockNumber);
    }
}
