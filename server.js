// server.js
import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

// ไฟล์เก็บ hostJobs
const DATA_FILE = path.resolve("./hostJobs.json");

// โหลด hostJobs จากไฟล์ (ถ้ามี)
let hostJobs = {};
if (fs.existsSync(DATA_FILE)) {
    try {
        hostJobs = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        console.log("Loaded hostJobs from file.");
    } catch (err) {
        console.error("Error loading hostJobs:", err);
    }
}

// บันทึก hostJobs ลงไฟล์
function saveHostJobs() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(hostJobs, null, 2));
}

// เช็ค host online หรือไม่
async function isUserOnline(userId) {
    try {
        const res = await fetch("https://presence.roblox.com/v1/presence/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds: [userId.toString()] })
        });
        const data = await res.json();
        if (data && data.userPresences && data.userPresences[0]) {
            // presenceType 1 = online in game
            return data.userPresences[0].presenceType === 1;
        }
        return false;
    } catch (err) {
        console.error(err);
        return false;
    }
}

// POST host jobId
app.post("/jobid", (req, res) => {
    const { username, userId, jobId, placeId } = req.body;
    if (!username || !jobId || !placeId || !userId) {
        return res.status(400).json({ error: "Missing username, userId, jobId, or placeId" });
    }

    hostJobs[username] = { userId, jobId, placeId };
    saveHostJobs();
    console.log(`Host updated: ${username} => jobId: ${jobId}, placeId: ${placeId}`);
    res.json({ success: true });
});

// GET host jobId (เช็คว่า host online หรือไม่)
app.get("/jobid", async (req, res) => {
    const hostName = req.query.host;
    if (!hostName) return res.status(400).json({ error: "Missing host query param" });

    const data = hostJobs[hostName];
    if (!data) return res.status(404).json({ error: "Host not found" });

    const online = await isUserOnline(data.userId);
    if (!online) return res.status(200).json({ online: false });

    res.json({ online: true, jobId: data.jobId, placeId: data.placeId });
});

app.listen(port, () => {
    console.log(`JobId API running at http://localhost:${port}`);
});
