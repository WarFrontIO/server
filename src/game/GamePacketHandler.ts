import {packetRegistry} from "../network/NetworkManager";
import {AttackActionPacket} from "../network/protocol/packet/game/AttackActionPacket";
import {BoatActionPacket} from "../network/protocol/packet/game/BoatActionPacket";
import {PacketException} from "../network/protocol/util/PacketException";
import {SpawnRequestPacket} from "../network/protocol/packet/game/SpawnRequestPacket";
import type {NetworkClient} from "../network/Client.ts";
import {Game} from "./Game.ts";

packetRegistry.handle(SpawnRequestPacket, function (client): void {
	pkgAssert(client.data.clientId !== undefined);
	getGame(client).setSpawn(client.data.clientId, this.position);
});

//TODO: Add some very basic validation here (already done by the client, but still)
//TODO: Add rate limiting to all actions

packetRegistry.handle(AttackActionPacket, function (client): void {
	pkgAssert(client.data.clientId === this.attacker);
	getGame(client).addAction(this, AttackActionPacket);
});

packetRegistry.handle(BoatActionPacket, function (client): void {
	pkgAssert(client.data.clientId === this.player);
	getGame(client).addAction(this, BoatActionPacket);
});

/**
 * Asserts a condition.
 * @param condition The condition to assert
 * @throws PacketException if the condition is not met
 */
function pkgAssert(condition: boolean): asserts condition {
	if (!condition) {
		throw new PacketException("Assertion failed");
	}
}

/**
 * Get the game of the given client.
 * @param ws The client to get the game of
 * @throws PacketException if the client is not in a game
 */
function getGame(ws: NetworkClient): Game {
	if (ws.data.game instanceof Game) {
		return ws.data.game;
	}
	throw new PacketException("Game not found");
}