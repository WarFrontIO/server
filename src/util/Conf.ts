/**
 * Server host domain, required for authentication. Should be set to the domain of the server.
 */
export const host = process.env.HOST ? process.env.HOST.replace(/^https?:\/\/|\/$/g, "") : undefined;
/**
 * Port to run the server on
 */
export const port = process.env.PORT ? parseInt(process.env.PORT) : 10364;