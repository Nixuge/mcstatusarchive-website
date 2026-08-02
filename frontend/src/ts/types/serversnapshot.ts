export type FieldChangeTuple = [number, any];

export interface ServerDataResponse {
    server: {
        id: number;
        table_name: string;
        ip: string;
        port: number;
        type: number;
    };
    heartbeats: number[];
    metrics: {
        [key: string]: [number, number][];
    };
    text_values?: {
        [value_id: string]: string;
    };
    texts: {
        [key: string]: [number, number][];
    };
}

export interface ServerSnapshot {
    save_time: number;
    motd?: string;
    favicon?: string;
    ping?: number;
    players_max?: number;
    players_on?: number;
    version_name?: string;
    version_protocol?: number;
    players_sample?: string;
    version_brand?: string;
    gamemode?: string;
    map?: string;
    type?: number;
    [key: string]: any; // Indexable (= accessible with interface["property"])
}