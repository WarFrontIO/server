import {packetRegistry} from "../network/NetworkManager";
import {GameActionPacket} from "../network/protocol/packet/game/GameActionPacket";
import {GameStartPacket} from "../network/protocol/packet/game/GameStartPacket";
import {BasePacket} from "../network/protocol/packet/BasePacket";
import {GameTickPacket} from "../network/protocol/packet/game/GameTickPacket";
import type {PacketType} from "../network/protocol/PacketRegistry";
import {PacketException} from "../network/protocol/util/PacketException";
import {SpawnBundlePacket} from "../network/protocol/packet/game/SpawnBundlePacket";
import {disconnect, type NetworkClient, sendPacket} from "../network/Client.ts";
import {randomBytes} from "crypto";
import {type RunnerInstance, startRunner} from "../runner/RunnerManager.ts";
import {SocketErrorCodes} from "../network/protocol/util/SocketErrorCodes.ts";

export class Game {
	private readonly players: NetworkClient[];
	private readonly packetQueue: GameActionPacket<unknown>[] = [];
	private readonly playerSpawns: { position: number, updated: number }[] = [];
	private readonly tickInterval: Timer;
	private readonly gameRunner: RunnerInstance;
	private incrementalId = -20;

	/**
	 * Creates a new game instance.
	 * @param players The players in the game
	 * @param map The map to start the game with
	 */
	constructor(players: NetworkClient[], map: string) {
		this.gameRunner = startRunner();
		this.players = players;

		const seed = randomBytes(4).readUInt32LE(0);
		const playerList = players.map(player => ({name: player.data.name, account: player.data.auth}));
		for (let i = 0; i < players.length; i++) {
			players[i]!.data.game = this;
			players[i]!.data.clientId = i;
			sendPacket(players[i]!, new GameStartPacket(map, 0, seed, i, playerList));
		}
		this.gameRunner.send(GameStartPacket.prototype.transferContext.serialize(new GameStartPacket(map, 0, seed, 0, playerList), packetRegistry));

		this.tickInterval = setInterval(() => this.tick(), 500);

		this.gameRunner.result.then(result => {
			//TODO: handle result
			this.endGame();
		}).catch(error => {
			console.error(error);
			//TODO: notify players
			this.endGame();
		})
	}

	/**
	 * Ticks the game.
	 * Will be called every 500ms.
	 */
	tick(): void {
		if (this.incrementalId < 0) {
			const spawns = this.playerSpawns.map((spawn, index) => ({player: index, position: spawn.position, updated: spawn.updated})).filter(spawn => spawn.updated === this.incrementalId);
			this.broadcast(new SpawnBundlePacket(spawns, -this.incrementalId++));
		} else {
			this.broadcast(new GameTickPacket(this.incrementalId++, this.packetQueue));
			this.packetQueue.length = 0;
		}
	}

	/**
	 * Sets the spawn for a player.
	 * @param player The player to set the spawn for
	 * @param position The position of the
	 */
	setSpawn(player: number, position: number): void {
		if (this.hasStarted()) {
			return; // This could be sent before the game started but arrived after, so we just drop it
		}
		this.playerSpawns[player] = {position, updated: this.incrementalId};
	}

	/**
	 * Adds an action to the game.
	 * @param action The action to add
	 * @param prototype The prototype of the action
	 * @throws PacketException if the game has not started yet
	 */
	addAction<T extends GameActionPacket<T>>(action: T, prototype: PacketType<T>): void {
		if (!this.hasStarted()) {
			throw new PacketException("Game has not started yet");
		}
		action.actionId = prototype.prototype.actionId;
		action.transferContext = prototype.prototype.transferContext;
		this.packetQueue.push(action as GameActionPacket<unknown>);
	}

	/**
	 * Adds a player to the game.
	 * @param player The player to add
	 */
	removePlayer(player: NetworkClient): void {
		const index = this.players.indexOf(player);
		if (index !== -1) {
			this.players.splice(index, 1);
		}
		if (this.players.length === 0) {
			this.gameRunner.stop();
			this.endGame();
		}
	}

	/**
	 * Ends the game and cleans up relevant caches.
	 */
	endGame(): void {
		clearInterval(this.tickInterval);
		for (const player of this.players) {
			disconnect(player, SocketErrorCodes.NO_ERROR); //TODO: This is not necessarily the correct error code
		}
		this.players.length = 0;
	}

	/**
	 * Returns whether the game has started.
	 * @returns Whether the game has started
	 */
	hasStarted(): boolean {
		return this.incrementalId >= 0;
	}

	/**
	 * Broadcasts a packet to all players in the game.
	 * @param packet The packet to broadcast
	 */
	private broadcast<T extends BasePacket<T>>(packet: T): void {
		const raw = packet.transferContext.serialize(packet, packetRegistry);
		for (const player of this.players) {
			player.send(raw);
		}
		this.gameRunner.send(raw);
	}
}