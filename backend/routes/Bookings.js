const express = require("express");
const Booking = require("../models/Booking");  // Import the Booking model
const moment = require("moment");  // Import moment for date handling
const PDFDocument = require("pdfkit");  // Import PDFKit for generating PDF
const jwt = require("jsonwebtoken");  // Import JWT for authentication
const router = express.Router();

// Middleware for verifying admin JWT
const protectAdmin = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  console.log("Token received in middleware:", token);  // Log token for debugging

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;  // Attach admin info to request
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ message: "Token is not valid" });
  }
};

// Delete bookings after 2:00 PM for today
const deleteBookingsAfter2PM = async () => {
  const currentTime = moment();
  const cutoffTime = currentTime.set({ hour: 14, minute: 0, second: 0 }); // 2:00 PM cutoff

  // Delete bookings for the current day after 2:00 PM
  try {
    await Booking.deleteMany({
      date: {
        $gte: currentTime.startOf("day").toISOString(),
        $lt: cutoffTime.toISOString(),
      },
    });
    console.log("Bookings after 2:00 PM have been deleted.");
  } catch (error) {
    console.error("Error deleting bookings after 2:00 PM:", error);
  }
};

// Call deleteBookingsAfter2PM at 2:00 PM every day (via cron job or interval)
setInterval(deleteBookingsAfter2PM, 60 * 60 * 1000); // Run every hour to check for bookings to delete

// Get all bookings
router.get("/", protectAdmin, async (req, res) => {  // Protect the route with the middleware
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// Post a new booking
router.post("/", async (req, res) => {
  const { name, psNumber, department, meal, date } = req.body;

  const currentTime = moment();
  let bookingDate = moment(date).startOf('day'); // Ensure the time is set to midnight (start of the day)

  // Automatically change the date for lunch bookings after 9:30 AM
  if (meal === 'Lunch' && currentTime.isAfter(bookingDate.set({ hour: 9, minute: 30 }))) {
    bookingDate.add(1, 'day');  // Add one day to the booking date
  }

  try {
    const newBooking = new Booking({
      name,
      psNumber,
      department,
      meal,
      date: bookingDate.toISOString(), // Save the date without time
    });

    await newBooking.save();
    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Error saving booking:", error);
    res.status(500).json({ message: "Failed to submit booking" });
  }
});

// Get the count of bookings for Breakfast and Lunch
router.get("/counts", protectAdmin, async (req, res) => {  // Protect the route with the middleware
  try {
    const bookings = await Booking.find();
    const breakfastCount = bookings.filter(b => b.meal === 'Breakfast').length;
    const lunchCount = bookings.filter(b => b.meal === 'Lunch').length;
    res.json({ breakfastCount, lunchCount });
  } catch (error) {
    console.error("Error fetching booking counts:", error);
    res.status(500).json({ message: "Failed to fetch booking counts" });
  }
});

// Download bookings as PDF
router.get("/download", protectAdmin, async (req, res) => {  // Protect the route with the middleware
  try {
    const currentTime = moment();
    const cutoffTime = moment().set({ hour: 14, minute: 0, second: 0 }); // 2:00 PM cutoff

    let startDate, endDate;

    if (currentTime.isBefore(cutoffTime)) {
      // Before 2:00 PM, fetch today's (30th) bookings
      startDate = moment().startOf("day"); // 30th 00:00 AM
      endDate = moment().set({ hour: 13, minute: 59, second: 59 }); // 30th 1:59 PM
    } else {
      // After 2:00 PM, fetch tomorrow's (31st) bookings
      startDate = moment().startOf("day").add(1, "days").set({ hour: 14, minute: 0, second: 0 }); // 30th 2:00 PM onward
      endDate = moment().startOf("day").add(2, "days").set({ hour: 13, minute: 59, second: 59 }); // 31st 1:59 PM
    }

    // Fetch bookings between startDate and endDate
    const bookings = await Booking.find({
      date: { $gte: startDate.toISOString(), $lte: endDate.toISOString() },
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings_report.pdf');
    doc.pipe(res);

    // PDF Title
    doc.fontSize(20).text("Bookings Report", { align: 'center' }).moveDown();

    // Define table headers
    const headers = ['Name', 'PS Number', 'Meal', 'Department', 'Date', 'Sign'];
    let startX = 50, startY = 100, columnWidth = 80, signColumnWidth = 100, rowHeight = 40;
    const totalWidth = columnWidth * 5 + signColumnWidth;

    // Draw table box
    doc.rect(startX - 10, startY - 10, totalWidth + 20, (bookings.length * rowHeight) + 60).stroke();

    // Draw headers
    headers.forEach((header, i) => {
      doc.fontSize(12).text(header, startX + (i * columnWidth), startY, { width: i === 5 ? signColumnWidth : columnWidth, align: 'center' });
    });

    doc.moveTo(startX - 10, startY + rowHeight).lineTo(startX + totalWidth + 10, startY + rowHeight).stroke();
    let yPosition = startY + rowHeight;

    // Fill table with booking data
    bookings.forEach(booking => {
      let xPosition = startX;
      doc.text(booking.name, xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;
      doc.text(booking.psNumber, xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;
      doc.text(booking.meal, xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;
      doc.text(booking.department, xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;
      doc.text(moment(booking.date).format('YYYY-MM-DD'), xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;
      doc.text('', xPosition, yPosition + 10, { width: signColumnWidth, align: 'center' });

      yPosition += rowHeight;
      doc.moveTo(startX - 10, yPosition).lineTo(startX + totalWidth + 10, yPosition).stroke();
    });

    doc.moveTo(startX - 10, yPosition).lineTo(startX + totalWidth + 10, yPosition).stroke();
    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
});

module.exports = router;
