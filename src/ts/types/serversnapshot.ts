export interface ServerSnapshot {
    save_time: number;
    motd?: string;
    favicon?: string;
    ping?: number;
    players_max?: number;
    players_on?: number;
    version_name?: string;
    version_protocol?: number;
}