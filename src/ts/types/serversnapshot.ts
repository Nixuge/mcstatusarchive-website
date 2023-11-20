export interface ServerSnapshot {
    save_time: number;
    save_date: Date;
    motd?: string;
    favicon?: string; // not implemented
    ping?: number;
    players_max?: number;
    players_on?: number;
    version_name?: string;
    version_protocol?: number;
    [key: string]: any; // Indexable (= accessible with interface["property"])
}