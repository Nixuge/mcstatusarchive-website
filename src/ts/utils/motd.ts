import { autoToHTML as motdParser } from '@sfirew/minecraft-motd-parser'


export function parseMotd(motd: string | undefined, nullMessage?: string) {
    if (motd === null || motd === undefined) {
        return (nullMessage) ? nullMessage : "§6Can't connect to server";
    } else if (motd[0] == '{') {
        try {
            const data = motdParser(JSON.parse(motd));            
            return data;
        } catch (error) {
            // Multiple reasons this can happen:
            // - The MOTD is in Python dict format (an issue I did at first) and not in standard JSON,
            // hence why parsing it throws an error
            // - The MOTD is simply a string that starts with { (unlikely but possible)
            // --- this check is here for performances reason tho, I don't want to try and parse everything as json
            // --- before falling back if it fails.
            return motdParser("§cFailed to parse MOTD: " + error);
        }
    } else {
        return motdParser(motd);
    }
}