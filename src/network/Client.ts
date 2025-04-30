import {SocketErrorCodes} from "./protocol/util/SocketErrorCodes";
import {packetRegistry} from "./NetworkManager";
import {authAvailable, verifyToken} from "../util/UserAuth";
import {HandshakeResponsePacket} from "./protocol/packet/handshake/HandshakeResponsePacket";
import {HandshakeAuthPacket} from "./protocol/packet/handshake/HandshakeAuthPacket";
import {PROTOCOL_VERSION} from "./protocol/PacketRegistry";
import {BasePacket} from "./protocol/packet/BasePacket";
import {Game} from "../game/Game";
import {queueGame, ScheduledGame} from "../game/GameQueue";
import {apiToUserAccount, type UserAccount} from "./protocol/util/ProtocolUtils";
import type {ServerWebSocket} from "bun";

export type WebSocketData = {
	handshake: boolean;
	name: string;
	auth: UserAccount | undefined;
	game: Game | ScheduledGame | undefined;
	clientId: number | undefined;
}
export type NetworkClient = ServerWebSocket<WebSocketData>;

/**
 * Disconnects the client from the server.
 * @param ws the client to disconnect
 * @param code the code to disconnect with (in the range 4000-4999, see {@link SocketErrorCodes})
 */
export function disconnect(ws: NetworkClient, code: SocketErrorCodes) {
	ws.close(code);
	ws.data.game?.removePlayer(ws);
}

/**
 * Sends a packet to the client.
 * @param ws the client receiving the packet
 * @param data the packet to send
 */
export function sendPacket<T extends BasePacket<T>>(ws: NetworkClient, data: T) {
	if (!ws.data.handshake || ws.readyState !== WebSocket.OPEN) {
		return 0;
	}
	return ws.send(data.transferContext.serialize(data, packetRegistry));
}

/**
 * Broadcasts a packet to all clients.
 * @param clients the clients to send the packet to
 * @param data the packet to send
 */
export function broadcastPacket<T extends BasePacket<T>>(clients: Iterable<NetworkClient>, data: T) {
	const serialized = data.transferContext.serialize(data, packetRegistry);
	for (const client of clients) {
		if (client.data.handshake && client.readyState === WebSocket.OPEN) {
			client.send(serialized);
		}
	}
}

packetRegistry.handle(HandshakeAuthPacket, async function (ws) {
	if (this.version !== PROTOCOL_VERSION) {
		disconnect(ws, this.version < PROTOCOL_VERSION ? SocketErrorCodes.OUT_OF_DATE : SocketErrorCodes.SERVER_OUT_OF_DATE);
		return;
	}

	if (this.auth && authAvailable) {
		const auth = await verifyToken(this.auth).catch(() => undefined);
		if (!auth) {
			disconnect(ws, SocketErrorCodes.HANDSHAKE_BAD_AUTH);
			return;
		}
		ws.data.auth = apiToUserAccount(auth);
	}
	ws.data.name = this.name;
	ws.data.handshake = true;
	sendPacket(ws, new HandshakeResponsePacket());

	queueGame(ws);
});