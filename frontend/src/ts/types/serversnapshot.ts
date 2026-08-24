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

export interface BaseSnapshot {
    save_time: number;
    motd?: string;
    ping?: number;
    players_max?: number;
    players_on?: number;
    version_name?: string;
    version_protocol?: number;
    type?: number;
    [key: string]: any; // Indexable (= accessible with interface["property"])
}

export interface JavaSnapshot extends BaseSnapshot {
    favicon?: string;
    players_sample?: string;
    enforces_secure_chat?: number;
    forge_fml_network_version?: number;
    forge_truncated?: number;
    forge_channels?: string;
    forge_mods?: string;
}

export interface BedrockSnapshot extends BaseSnapshot {
    version_brand?: string;
    gamemode?: string;
    map?: string;
}

export type ServerSnapshot = JavaSnapshot | BedrockSnapshot;