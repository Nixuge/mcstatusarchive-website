import { textToHTML, JSONToHTML } from '@sfirew/minecraft-motd-parser'


// Multiple reasons this can happen:
// - The MOTD is in Python dict format (an issue I did at first) and not in standard JSON,
// hence why parsing it throws an error
// - The MOTD is simply a string that starts with { (unlikely but possible)
// --- this check is here for performances reason tho, I don't want to try and parse everything as json
// --- before falling back if it fails.
function doCatch(func: Function, toParse: string, json?: boolean) {
    try {
        if (json) return func(JSON.parse(toParse))
        return func(toParse);
    } catch(error) {
        return textToHTML("§cFailed to parse MOTD: " + error);
    }
}

export function parseMotd(motd: string | undefined, nullMessage?: string) {
    if (motd === null || motd === undefined) {
        return doCatch(textToHTML, (nullMessage) ? nullMessage : "§4Can't connect to server")
    } else if (motd[0] == '{') {
        return doCatch(JSONToHTML, motd, true)
    } else {
        return doCatch(textToHTML, motd);
    }
}