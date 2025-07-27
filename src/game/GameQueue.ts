import {broadcastPacket, type NetworkClient} from "../network/Client.ts";
import {Game} from "./Game";
import {GameQueueUpdatePacket} from "../network/protocol/packet/game/GameQueueUpdatePacket";

let gameQueue: ScheduledGame[] = [];

export class ScheduledGame {
	private readonly time: number;
	private readonly players: NetworkClient[] = [];

	constructor() {
		this.time = (gameQueue.length === 0 ? Date.now() : gameQueue[gameQueue.length - 1]!.time) + 60000;
	}

	//TODO: Remove player from queue when they disconnect
	public addPlayer(player: NetworkClient): void {
		this.players.push(player);
		player.data.game = this;
		player.data.clientId = undefined;
	}

	public removePlayer(player: NetworkClient): void {
		const index = this.players.indexOf(player);
		if (index !== -1) {
			this.players.splice(index, 1);
		}
		if (this.players.length === 0) {
			const index = gameQueue.indexOf(this);
			if (index !== -1) {
				gameQueue.splice(index, 1);
			}
		}
	}

	public tick(): void {
		if (Date.now() > this.time) {
			this.start();
		} else {
			broadcastPacket(this.players, new GameQueueUpdatePacket(0, 0, this.players.length, Math.ceil((this.time - Date.now()) / 1000)));
		}
	}

	public start(): void {
		gameQueue.shift();
		if (gameQueue.length > 0) {
			setTimeout(() => gameQueue[0]!.start(), gameQueue[0]!.time - Date.now());
		}
		if (this.players.length === 0) {
			return;
		}
		new Game(this.players, "N858Os");
	}
}

export function queueGame(player: NetworkClient): void {
	if (gameQueue.length === 0) {
		gameQueue.push(new ScheduledGame());
	}
	gameQueue[0]!.addPlayer(player);
}

setInterval(() => {
	for (const game of gameQueue) {
		game.tick();
	}
}, 1000);