import {PacketRegistry} from "./protocol/PacketRegistry";
import {disconnect, type NetworkClient, type WebSocketData} from "./Client.ts";
import {SocketErrorCodes} from "./protocol/util/SocketErrorCodes";
import {port} from "../util/Conf";
import {deserializePacket} from "./protocol/DataTransferContext";
import {serve} from "bun";

export const packetRegistry = new PacketRegistry<NetworkClient>(_id => ws => disconnect(ws, SocketErrorCodes.BAD_PACKET));

serve<WebSocketData, {}>({
	port,
	fetch(req, server) {
		if (server.upgrade(req, {data: {handshake: false}})) return;
		return new Response("Upgrade failed", {status: 500});
	},
	websocket: {
		message(ws, message) {
			try {
				deserializePacket(message as Uint8Array, packetRegistry).handle(ws);
			} catch (e) {
				disconnect(ws, SocketErrorCodes.BAD_MESSAGE);
			}
		},
		close(ws) {
			disconnect(ws, SocketErrorCodes.NO_ERROR)
		}
	}
});
console.log("Listening on port " + port);

require("../game/GamePacketHandler");