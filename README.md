# Ploogies Battle Royale

A Loogies battle royale web3 game on Polygon, the goal is to survive as long as you can while colleting items and battling other players on the board to win a crown POAP.

# Description

An online multiplayer web3 game on the Polygon Mumbai network that blends last-man-standing gameplay with the survival element. The game start when all 6 PLoogies joins a board (you need to have a PLoogie and pay a low fee at registration). Ploogies are distributed randomly at every corner. Once the game starts, users can move 1 time per block by clicking on the board. Every block the board state is updated and the following logic is applied: 1) The outer playable ring  (origin/center is not a ring) turns red  every 10 blocks/turns killing all PLoogies on the affected board positions. 2) Moving a Loogie has a cost of x helath. 3) if there are more than 1 Loogie on the same board position,  they fight (Only 1 Loogie survive (the one with the higher health, if some have the same health the winner is decided by a random number) and steal the health from the fallen Loogies). At the end of the game, a PolyLoogie Crown POAP is minted to the owner of the winner PolyLoogie.

# 🏗 Scaffold-ETH

> everything you need to build on Ethereum! 🚀 [https://github.com/scaffold-eth/scaffold-eth](https://github.com/scaffold-eth/scaffold-eth) 

🧪 Quickly experiment with Solidity using a frontend that adapts to your smart contract:

![image](https://user-images.githubusercontent.com/2653167/124158108-c14ca380-da56-11eb-967e-69cde37ca8eb.png)


# 🏄‍♂️ Quick Start

Prerequisites: plus [Yarn](https://classic.yarnpkg.com/en/docs/install/) and [Git](https://git-scm.com/downloads)

> clone/fork 🏗 scaffold-eth:

```bash
git clone https://github.com/scaffold-eth/scaffold-eth.git
```

> install and start your 👷‍ Hardhat chain:

```bash
cd scaffold-eth
yarn install
yarn chain
```

> in a second terminal window, start your 📱 frontend:

```bash
cd scaffold-eth
yarn start
```

> in a third terminal window, 🛰 deploy your contract:

```bash
cd scaffold-eth
yarn deploy
```

