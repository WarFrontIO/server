import {spawn} from "bun";

export function startRunner() {
	let resolve: (result: any) => void, reject: (reason: any) => void;
	const ret = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});

	const runner = spawn(["bun", "src/runner/Runner"], {
		stdout: "ignore",
		ipc: result => resolve(result)
	});

	runner.exited.then(code => {
		reject(code);
	});

	return {
		send: (msg: Uint8Array) => runner.send(msg),
		stop: () => runner.send("exit"),
		result: ret
	};
}

export type RunnerInstance = {
	send: (msg: Uint8Array) => void;
	result: Promise<any>;
	stop(): void;
}