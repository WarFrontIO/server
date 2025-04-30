class Housekeeping {
	private readonly minorTasks: Set<Function> = new Set();
	private readonly majorTasks: Set<Function> = new Set();

	constructor() {
		setInterval(() => this.executeTasks(this.minorTasks), 30 * 1000);
		setInterval(() => this.executeTasks(this.majorTasks), 5 * 60 * 1000);
	}

	/**
	 * Register a minor task to be executed during housekeeping.
	 *
	 * Minor tasks are executed every 30 seconds.
	 *
	 * @param task the task to be executed
	 */
	registerMinorTask(task: Function): void {
		this.minorTasks.add(task);
	}

	/**
	 * Register a major task to be executed during housekeeping.
	 *
	 * Major tasks are executed every 5 minutes.
	 *
	 * @param task the task to be executed
	 */
	registerMajorTask(task: Function): void {
		this.majorTasks.add(task);
	}

	/**
	 * Execute all registered tasks.
	 */
	executeTasks(registry: Set<Function>): void {
		registry.forEach(task => task());
	}
}

export const housekeeping = new Housekeeping();