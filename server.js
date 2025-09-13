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

// POST host jobId (heartbeat)
app.post("/jobid", (req, res) => {
    const { username, userId, jobId, placeId, players, maxPlayers, full } = req.body;
    if (!username || !jobId || !placeId || !userId) {
        return res.status(400).json({ error: "Missing username, userId, jobId, or placeId" });
    }

    hostJobs[username] = { 
        userId, 
        jobId, 
        placeId,
        players: players || 0,
        maxPlayers: maxPlayers || 0,
        full: full || false,
        lastUpdate: Date.now()
    };

    saveHostJobs();
    console.log(`Host updated: ${username} => jobId: ${jobId}, placeId: ${placeId}, full: ${full}`);
    res.json({ success: true });
});

// GET host jobId (ใช้ heartbeat เช็ค online)
app.get("/jobid", (req, res) => {
    const hostName = req.query.host;
    if (!hostName) return res.status(400).json({ error: "Missing host query param" });

    const data = hostJobs[hostName];
    if (!data) return res.status(404).json({ error: "Host not found" });

    // ถ้า host ไม่ส่ง heartbeat เกิน 15 วิ → offline
    const online = Date.now() - data.lastUpdate < 15000;

    if (!online) return res.status(200).json({ online: false });

    res.json({ 
        online: true, 
        jobId: data.jobId, 
        placeId: data.placeId,
        players: data.players,
        maxPlayers: data.maxPlayers,
        full: data.full
    });
});

app.listen(port, () => {
    console.log(`JobId API running at http://localhost:${port}`);
});
