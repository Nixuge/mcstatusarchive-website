export const API_URL = (process.env.NODE_ENV == "development") ? 
    "http://127.0.0.1:50474" : "/api";


export const SERVER_IP_BLACKLIST: string[] = [
    "mavenmc.net",
    "play.zakuvro.com",
    "mc.paulzzh.com",
    "alner.pl"
];
