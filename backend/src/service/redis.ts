import { createClient } from 'redis';

const client = createClient();
client.on('connect', () => console.log('Connected to Redis'));
// Log Redis errors without crashing the server
client.on('error', (err) => console.error('Redis Client Error:', err.message));

const redis = client.connect().catch((err) => {
    console.error('Failed to connect to Redis. Running without cache.');
});

async function safeGet(key: string | number): Promise<string | null> {
    try {
        return await client.get(String(key));
    } catch (error) {
        console.warn(`Redis GET failed for key "${key}". Falling back to DB.`);
        return null;
    }
}

async function safeSet(key: string | number, value: string): Promise<void> {
    try {
        await client.set(String(key), value);
    } catch (error) {
        console.warn(`Redis SET failed for key "${key}". Skipping cache write.`);
    }
}
async function safeTag(){
    try{
        return await client.get("tag");
    }
    catch(error){
        console.warn(`Redis GET failed for key "tag". Skipping cache read.`);
    }
}
export { redis, client, safeGet, safeSet, safeTag };