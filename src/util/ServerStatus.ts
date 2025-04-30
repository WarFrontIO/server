let isShuttingDown = false;

/**
 * Gracefully shuts down the server.
 * This waits for all games to finish before shutting down.
 * Where possible, clients will be migrated to other servers.
 */
export function shutdown(): void {
	console.info("Doing a graceful shutdown");
	isShuttingDown = true;
}