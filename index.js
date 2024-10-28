import express from "express";
import pg from "pg";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";


const redis = new Redis();
const port = 4000;
const app = express();
const jwt_secret="WayPortAssignment";
app.use(cookieParser());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "wayPort",
    password: "somya23",
    port: 5432,
});

// Connect to the database
db.connect();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/",(req,res)=>{
    res.render("landingpage.ejs");
});

// Login page
app.get("/login", (req, res) => {
    res.render("login.ejs", { showOtpField: false, phone: ''  });

    console.log("Login page executed");                           // Remove console.log in prod
});

// Handle login/OTP generation and verification
app.post("/login", async (req, res) => {
    const { phone, otp } = req.body;

    if (!otp) {
        // Generate OTP and render page with OTP field
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        try {
            await redis.hset('otp_store', phone, generatedOtp);
            await redis.expire('otp_store', 300);
            console.log(`Generated OTP for ${phone}: ${generatedOtp}`);
            res.render("login.ejs", { showOtpField: true, phone });
        } catch (error) {
            console.error("Error saving OTP to Redis:", error);
            res.status(500).json({ message: "Error generating OTP" });
        }
    } else {
        // Verify OTP
        try {
            const storedOtp = await redis.hget('otp_store', phone);
            console.log("Stored OTP:", storedOtp);              //Remove conole.log in prod
            console.log("User OTP:", otp);                      //Remove console.log in prod

            if (storedOtp === otp) {
                // OTP matches, create JWT token
                const token = jwt.sign({ phone },jwt_secret, { expiresIn: '1h' });
                

                // Delete OTP after verification
                await redis.hdel('otp_store', phone);
                res.json({ message: "OTP verified", token });
            } else {
                res.status(401).json({ message: "INVALID OTP" });
            }
        } catch (error) {
            console.error("Error retrieving OTP from Redis:", error);
            res.status(500).json({ message: "Error verifying OTP" });
        }
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


redis.on('connect', () => {
    console.log("Connected to Redis");
});

redis.on('error', (err) => {
    console.log("Error connecting to Redis:", err);
});
