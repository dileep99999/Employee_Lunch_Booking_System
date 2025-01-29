require("dotenv").config();
console.log("MongoDB URI:", process.env.MONGO_URI); // Debugging line

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bookingRoutes = require("./routes/Bookings");
const authRoutes = require("./routes/auth");  // Add authentication routes

const app = express();
app.use(cors());
app.use(bodyParser.json());



app.use("/bookings", bookingRoutes);
app.use("/auth", authRoutes);  // Use the authentication routes

// Delete bookings after 2:00 PM for the current day
const deleteBookingsAfter2PM = async () => {
  const currentTime = moment(); // Get current time
  const cutoffTime = currentTime.set({ hour: 14, minute: 0, second: 0 }); // 2:00 PM cutoff

  // Delete bookings that are from the current day but after 2:00 PM
  try {
    await Booking.deleteMany({
      date: {
        $gte: currentTime.startOf("day").toISOString(), // Start of today (midnight)
        $lt: cutoffTime.toISOString(), // Cutoff time (2:00 PM)
      },
    });
    console.log("Bookings after 2:00 PM for today have been deleted.");
  } catch (error) {
    console.error("Error deleting bookings after 2:00 PM:", error);
  }
};

// Call deleteBookingsAfter2PM every hour (or adjust timing as needed)
setInterval(deleteBookingsAfter2PM, 60 * 60 * 1000); // Run every hour (60 minutes * 60 seconds * 1000 milliseconds)

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
