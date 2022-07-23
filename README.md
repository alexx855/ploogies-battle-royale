# ⚔️ Ploogies Battle Royale

A Loogies battle royale web3 game on Polygon, the goal is to survive as long as you can while colleting items and battling other players on the board.

# 📖 Description

An online multiplayer web3 game on the Polygon network that blends last-man-standing gameplay with the survival element. The game start when all 4 PLoogies joins a board. Ploogies are distributed at every corner by registration order untill the board is full. Then the game starts, users can move to the side fields 1 time every 10 secs by clicking the UI buttons. On every player move the board state is updated and the following logic is applied: 1) The external fields of the board turns red every 10 turns killing all player on these positions. 2) Moving a Loogie has a cost of x helath. 3) if there are more than 1 PLoogie on the same position, they fight and the one with the higher health (if they have the same health will be the caller) steal the health from the other PLoogie). The games ends when all loogies are dead or when only 1 player still alive (winner).

# 🏄‍♂️ Quick Start

Prerequisites: plus [Yarn](https://classic.yarnpkg.com/en/docs/install/) and [Git](https://git-scm.com/downloads)

> clone/fork 🏗 scaffold-eth:

```bash
git clone https://github.com/alexx855/ploogies-battle-royale.git
```

> install and start your 👷‍ Hardhat chain:

```bash
cd ploogies-battle-royale
yarn install
yarn chain
```

> in a second terminal window, start your 📱 frontend:

```bash
cd ploogies-battle-royale
yarn start
```

> in a third terminal window, 🛰 deploy your contract:

```bash
cd ploogies-battle-royale
yarn deploy
```

