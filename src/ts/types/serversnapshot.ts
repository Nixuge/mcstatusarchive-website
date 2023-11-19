export interface ServerSnapshot {
    save_time: number;
    save_date: Date;
    motd?: string;
    favicon?: string;
    ping?: number;
    players_max?: number;
    players_on?: number;
    version_name?: string;
    version_protocol?: number;
    fail?: boolean; // To be used to fill in the blanks ?
}