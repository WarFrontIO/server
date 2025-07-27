import {packetRegistry} from "./client/src/network/PacketManager";
import {gameResultRegistry} from "./client/src/game/Game.ts";
import {gameLoadFailRegistry} from "./client/src/game/GameLoader.ts";
import {sleep} from "bun";
import {deserializePacket} from "./client/src/network/protocol/DataTransferContext.ts";
import {useAuthentication} from "./client/src/network/api/Endpoint.ts";
import {gameTicker} from "./client/src/game/GameTicker.ts";

if (process.env.SERVICE_TOKEN) {
	const token = "Bearer " + process.env.SERVICE_TOKEN;
	useAuthentication(async options => {
		options.headers = new Headers(options.headers);
		options.headers.set("Authorization", token);
		return options;
	});
}

gameResultRegistry.register((result) => {
	process.send && process.send(result);
	gameTicker.stop();
	process.exit(0);
});

//TODO: This needs to be automated based on module flags
require("./client/src/game/bot/modifier/BoatAttackStrategy");
require("./client/src/game/bot/modifier/BotConstraints");
require("./client/src/game/bot/modifier/BotTrigger");
require("./client/src/game/bot/modifier/SimpleAttackStrategy");
require("./client/src/game/GamePacketHandler");
require("./client/src/game/mode/FFAGameMode");

gameLoadFailRegistry.register((e) => console.error(e));

process.on("message", msg => {
	if (msg === "exit") process.exit(0);
	deserializePacket(msg as Uint8Array, packetRegistry).handle();
});

await sleep(8 * 60 * 60 * 1000); // time out after 8 hours
process.exit(0);