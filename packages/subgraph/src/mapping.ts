import { BigInt } from "@graphprotocol/graph-ts";
import {
  Restart,
  Register,
  Move,
  NewCurse,
  CollectedHealth,
  GameOver,
  NewHealthDrop,
} from "../generated/Game/Game";
import { WorldMatrix, Player, Game } from "../generated/schema";

export function handleRestart(event: Restart): void {
  // let gameString = event.params.gameId.toString();
  // TODO: make gameID a counter in the contract

  let game = Game.load("hackfs");
  if (game === null) {
    game = new Game("hackfs");
  }

  game.height = event.params.height;
  game.width = event.params.width;
  game.createdAt = event.block.timestamp;
  game.restartBlockNumber = event.block.number;
  game.nextCurseBlockNumber = event.params.nextCurseBlockNumber;
  game.gameOn = true;
  game.save();

  for (let i = 0; i < event.params.width; i++) {
    for (let j = 0; j < event.params.height; j++) {
      const fieldId = i.toString() + "-" + j.toString();
      let field = WorldMatrix.load(fieldId);
      if (field === null) {
        field = new WorldMatrix(fieldId);
        field.x = i;
        field.y = j;
      }
      field.cursed = false;
      field.player = null;
      field.healthAmountToCollect = BigInt.fromI32(0);
      field.save();
    }
  }

  game.save();
}

export function handleRegister(event: Register): void {
  // let gameString = event.params.txOrigin.toHexString();
  // let game = Game.load(gameString);
  // if (game) {
  //   if (!game.players) {
  //     game.players = [];
  //   }
  //   game.players.push(playerString);
  //   game.save();
  // }
  let playerString = event.params.txOrigin.toHexString();

  let player = Player.load(playerString);

  if (player === null) {
    player = new Player(playerString);
    // player.address = event.params.txOrigin;
  }

  player.loogieId = event.params.loogieId;
  player.health = BigInt.fromI32(100);
  // player.token = BigInt.fromI32(0);
  player.x = event.params.x;
  player.y = event.params.y;
  player.createdAt = event.block.timestamp;
  player.transactionHash = event.transaction.hash.toHex();
  // player.lastAction = event.block.timestamp;
  // player.lastActionBlock = event.block.number;
  player.save();

  const fieldId = event.params.x.toString() + "-" + event.params.y.toString();
  let field = WorldMatrix.load(fieldId);
  if (field !== null) {
    field.player = playerString;
    field.save();
  }
}

export function handleMove(event: Move): void {
  let playerString = event.params.txOrigin.toHexString();

  let player = Player.load(playerString);

  if (player !== null) {
    const oldX = player.x;
    const oldY = player.y;

    const oldFieldId = oldX.toString() + "-" + oldY.toString();
    let oldField = WorldMatrix.load(oldFieldId);
    if (oldField !== null) {
      oldField.player = null;
      oldField.save();
    }

    player.health = event.params.health;
    player.x = event.params.x;
    player.y = event.params.y;
    player.lastAction = event.block.timestamp;
    player.lastActionBlock = event.block.number;

    player.save();

    const fieldId = event.params.x.toString() + "-" + event.params.y.toString();
    let field = WorldMatrix.load(fieldId);
    if (field !== null) {
      field.player = playerString;
      field.save();
    }
  }
}

export function handleCollectedHealth(event: CollectedHealth): void {
  let playerString = event.params.player.toHexString();

  let player = Player.load(playerString);
  if (player !== null) {
    player.health = player.health.plus(event.params.amount);
    player.save();

    const fieldId = player.x.toString() + "-" + player.y.toString();
    let field = WorldMatrix.load(fieldId);
    if (field !== null) {
      field.healthAmountToCollect = BigInt.fromI32(0);
      field.save();
    }
  }
}

export function handleHealthNewDrop(event: NewHealthDrop): void {
  const fieldId = event.params.x.toString() + "-" + event.params.y.toString();
  let field = WorldMatrix.load(fieldId);
  if (field !== null) {
    field.healthAmountToCollect = field.healthAmountToCollect.plus(
      event.params.amount
    );

    field.save();
  }
}

// export function handleBattle(event: NewBattle): void {
// }

export function handleNewCurse(event: NewCurse): void {
  // TODO: make the external fields in the the world matrix cursed
}
export function handleGameOver(event: GameOver): void {
  // TODO: handle game over
}
