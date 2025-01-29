const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  name: String,
  psNumber: String,
  department: String,
  meal: String,
  date: String,
});

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
