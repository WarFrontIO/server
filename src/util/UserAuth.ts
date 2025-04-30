import {verify} from "jsonwebtoken";
import {host} from "./Conf";
import {type APIUserAccount} from "../network/protocol/util/ProtocolUtils";
import {file} from "bun";

const keyFile = file("public.key")
export let authAvailable = await keyFile.exists();
if (!authAvailable) {
	console.warn("No public key found, user authentication will not work");
	console.warn("Please provide the public key of the api server in a file named public.key in the working directory");
	console.warn("Make sure to also set the HOST environment variable to the domain of this server");
}
const publicKey = authAvailable ? await keyFile.text() : undefined;

/**
 * Verify a token, only accepts user tokens
 * @param token the token to verify
 * @returns the user information
 */
export async function verifyToken(token: string): Promise<APIUserAccount> {
	if (!authAvailable || !publicKey) {
		throw new Error("Authentication is not available");
	}
	return new Promise((resolve, reject) => {
		verify(token, publicKey, {algorithms: ["RS256"]}, (err, decoded) => {
			if (err || !decoded || typeof decoded !== "object") {
				reject();
				return;
			}
			if (typeof decoded.type !== "string" || typeof decoded.id !== "string" || typeof decoded.service !== "string" || typeof decoded.user_id !== "string" || typeof decoded.username !== "string" || typeof decoded.avatar_url !== "string") {
				reject();
				return;
			}
			// Both user and external tokens are accepted
			if (decoded.type === "user" || (decoded.type === "external" && decoded.aud === host)) {
				resolve(decoded as APIUserAccount);
			} else {
				reject();
			}
		});
	});
}