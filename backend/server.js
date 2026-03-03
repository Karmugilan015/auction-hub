import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(cors());

// ================= ENV VARIABLES =================
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;
const SECRET_KEY = process.env.SECRET_KEY;

// Validate environment variables
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing in .env");
  process.exit(1);
}

if (!SECRET_KEY || SECRET_KEY.length < 32) {
  console.error("❌ SECRET_KEY must be at least 32 characters long");
  process.exit(1);
}

// ================= DATABASE CONNECTION =================
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// ================= SCHEMAS =================
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const auctionItemSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  description: { type: String, required: true },
  currentBid: { type: Number, required: true },
  highestBidder: { type: String, default: "" },
  closingTime: { type: Date, required: true },
  isClosed: { type: Boolean, default: false },
  startingBid: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const AuctionItem = mongoose.model("AuctionItem", auctionItemSchema);

// ================= AUTH MIDDLEWARE =================
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// ================= ROUTES =================

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    mongodb:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// Root
app.get("/", (req, res) => {
  res.json({ message: "Auction API Server is running" });
});

// ================= AUTH ROUTES =================
app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "All fields required" });

    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ message: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      username,
      password: hashedPassword,
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/signin", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Signin successful",
      token,
    });
  } catch (error) {
    console.error("Signin error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ================= AUCTION ROUTES =================
app.post("/auction", authenticate, async (req, res) => {
  try {
    const { itemName, description, startingBid, closingTime } = req.body;

    if (!itemName || !description || !startingBid || !closingTime)
      return res.status(400).json({ message: "All fields required" });

    const newItem = await AuctionItem.create({
      itemName,
      description,
      currentBid: startingBid,
      startingBid,
      closingTime,
    });

    res.status(201).json({
      message: "Auction created",
      item: newItem,
    });
  } catch (error) {
    console.error("Create auction error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/auctions", async (req, res) => {
  try {
    const auctions = await AuctionItem.find().sort({ createdAt: -1 });
    res.json(auctions);
  } catch (error) {
    console.error("Fetch auctions error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/bid/:id", authenticate, async (req, res) => {
  try {
    const { bid } = req.body;
    const item = await AuctionItem.findById(req.params.id);

    if (!item)
      return res.status(404).json({ message: "Auction not found" });

    if (item.isClosed || new Date() > item.closingTime) {
      item.isClosed = true;
      await item.save();
      return res.status(400).json({
        message: "Auction closed",
        winner: item.highestBidder,
      });
    }

    if (bid <= item.currentBid)
      return res.status(400).json({
        message: "Bid must be higher than current bid",
      });

    item.currentBid = bid;
    item.highestBidder = req.user.username;

    await item.save();

    res.json({
      message: "Bid successful",
      item,
    });
  } catch (error) {
    console.error("Bid error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ================= START SERVER =================
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const existingUser = await User.findOne({ username });  
    if (existingUser) {  
      return res.status(400).json({ message: 'Username already exists' });  
    }  

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({ 
      username, 
      password: hashedPassword 
    });  
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });

  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Signin Route
app.post('/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ 
      userId: user._id, 
      username: user.username 
    }, SECRET_KEY, { 
      expiresIn: '1h' 
    });
    
    res.json({ 
      message: 'Signin successful', 
      token,
      user: {
        id: user._id,
        username: user.username
      }
    });

  } catch (error) {
    console.error('Signin Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Create Auction Item (Protected)
app.post('/auction', authenticate, async (req, res) => {
  try {
    const { itemName, description, startingBid, closingTime } = req.body;

    if (!itemName || !description || !startingBid || !closingTime) {  
      return res.status(400).json({ message: 'All fields are required' });  
    }  

    const newItem = new AuctionItem({  
      itemName,  
      description,  
      currentBid: startingBid,
      startingBid: startingBid,
      highestBidder: '',  
      closingTime,  
    });  

    await newItem.save();  
    res.status(201).json({ 
      message: 'Auction item created', 
      item: newItem 
    });

  } catch (error) {
    console.error('Auction Post Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get all auction items
app.get('/auctions', async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    
    if (status === 'active') {
      query = { isClosed: false, closingTime: { $gt: new Date() } };
    } else if (status === 'closed') {
      query = { $or: [{ isClosed: true }, { closingTime: { $lt: new Date() } }] };
    }
    
    const auctions = await AuctionItem.find(query).sort({ createdAt: -1 });
    res.json(auctions);
  } catch (error) {
    console.error('Fetching Auctions Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get a single auction item by ID
app.get('/auctions/:id', async (req, res) => {
  try {
    const auctionItem = await AuctionItem.findById(req.params.id);
    if (!auctionItem) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    if (!auctionItem.isClosed && new Date() > new Date(auctionItem.closingTime)) {
      auctionItem.isClosed = true;
      await auctionItem.save();
    }

    res.json(auctionItem);

  } catch (error) {
    console.error('Fetching Auction Item Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Bidding on an item (Protected)
app.post('/bid/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { bid } = req.body;
    const item = await AuctionItem.findById(id);

    if (!item) return res.status(404).json({ message: 'Auction item not found' });  
    
    if (item.isClosed) {
      return res.status(400).json({ 
        message: 'Auction is closed', 
        winner: item.highestBidder 
      });  
    }
    
    if (new Date() > new Date(item.closingTime)) {  
      item.isClosed = true;  
      await item.save();  
      return res.status(400).json({ 
        message: 'Auction closed', 
        winner: item.highestBidder 
      });  
    }  

    if (bid <= item.currentBid) {  
      return res.status(400).json({ 
        message: 'Bid must be higher than current bid',
        currentBid: item.currentBid
      });  
    }  

    item.currentBid = bid;  
    item.highestBidder = req.user.username;  
    await item.save();  
    
    res.json({ 
      message: 'Bid successful', 
      item,
      yourBid: bid
    });

  } catch (error) {
    console.error('Bidding Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
