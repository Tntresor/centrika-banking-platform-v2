const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

// Add at the very top after requires
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  console.log("Attempting to continue...");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  console.log("Attempting to continue...");
});

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    const { storage } = require("./storage-supabase");
    await storage.connect();
    console.log("✅ Database connection test passed");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

// Set default JWT secret if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "centrika-demo-secret-key-2025";
  console.log("⚠️  Using default JWT_SECRET for demo purposes");
}

// Load routes with error handling
let authRoutes,
  kycRoutes,
  transactionRoutes,
  cardRoutes,
  momoRoutes,
  adminRoutes,
  adminLiveRoutes,
  claudeRoutes;

try {
  authRoutes = require("./routes/auth-simple");
  kycRoutes = require("./routes/kyc-simple");
  transactionRoutes = require("./routes/transactions-simple");
  cardRoutes = require("./routes/cards-simple");
  momoRoutes = require("./routes/momo-simple");
  adminRoutes = require("./routes/admin-simple");
  adminLiveRoutes = require("./routes/admin-live");

  // Load Claude routes with error handling
  try {
    claudeRoutes = require("./routes/claude-routes");
    console.log("✅ Claude AI routes loaded successfully");
  } catch (error) {
    console.log("⚠️  Claude routes not available:", error.message);
    claudeRoutes = null;
  }

  console.log("✅ All routes loaded successfully");
} catch (error) {
  console.error("❌ Error loading routes:", error.message);
  process.exit(1);
}

// Services
const NotificationService = require("./services/NotificationService");

const app = express();
const PORT = process.env.PORT || 8000; // Changed from 8007 to 8000

// Serve mobile banking interface on root
app.get("/", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const mobileAppPath = path.join(__dirname, "../mobile/interactive-demo.html");

  fs.readFile(mobileAppPath, "utf8", (err, content) => {
    if (err) {
      res.json({
        service: "Centrika Neobank API",
        status: "running",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        message: "Mobile app not found, showing API status",
      });
    } else {
      res.setHeader("Content-Type", "text/html");
      res.send(content);
    }
  });
});

// API health check endpoint
app.get("/api", (req, res) => {
  res.json({
    service: "Centrika Neobank API",
    status: "running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    features: {
      auth: !!authRoutes,
      kyc: !!kycRoutes,
      transactions: !!transactionRoutes,
      cards: !!cardRoutes,
      momo: !!momoRoutes,
      admin: !!adminLiveRoutes,
      ai: !!claudeRoutes,
    },
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API routes with error handling
if (authRoutes) app.use("/api/auth", authRoutes);
if (kycRoutes) app.use("/api/kyc", kycRoutes);
if (transactionRoutes) app.use("/api/transactions", transactionRoutes);
if (cardRoutes) app.use("/api/cards", cardRoutes);
if (momoRoutes) app.use("/api/momo", momoRoutes);
if (adminLiveRoutes) {
  app.use("/api/admin", adminLiveRoutes);
  app.use("/api/auth/admin", adminLiveRoutes);
}

// Claude AI routes - ADD THIS NEW SECTION
if (claudeRoutes) {
  app.use("/api/claude", claudeRoutes);
  console.log("🤖 Claude AI features enabled at /api/claude/*");
} else {
  console.log(
    "⚠️  Claude AI features disabled - check ANTHROPIC_API_KEY and claude-service.js",
  );
}

// Serve mobile banking interface
app.use("/mobile", express.static("mobile"));
app.get("/mobile", (req, res) => {
  res.sendFile(path.join(__dirname, "../mobile/interactive-demo.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Initialize services - SINGLE INITIALIZATION FUNCTION
async function initializeServices() {
  try {
    console.log("🚀 Centrika Neobank - Starting Server");

    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.log("⚠️  Continuing without database connection");
    }

    // Initialize notification service
    try {
      await NotificationService.initialize();
      console.log("✅ NotificationService initialized");
    } catch (error) {
      console.log(
        "⚠️  NotificationService failed to initialize:",
        error.message,
      );
    }

    // Start server only once
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Health check: http://0.0.0.0:${PORT}/health`);
      console.log(`Database: ${dbConnected ? "Connected" : "Disconnected"}`);
      console.log(`AI Features: ${claudeRoutes ? "Enabled" : "Disabled"}`);
    });

    // Handle server errors
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.log(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        console.error("❌ Server error:", err);
      }
    });
  } catch (error) {
    console.error("❌ Failed to initialize services:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Only start server if this file is run directly
if (require.main === module) {
  initializeServices();
}

module.exports = app;
