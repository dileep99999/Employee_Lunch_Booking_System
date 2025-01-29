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
router.get("/", async (req, res) => {
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
router.get("/counts", async (req, res) => {
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

// Download the bookings as a PDF
router.get("/download", async (req, res) => {
  try {
    const currentTime = moment();
    const cutoffTime = currentTime.set({ hour: 14, minute: 0, second: 0 });

    let bookings;
    if (currentTime.isBefore(cutoffTime)) {
      // Fetch today's bookings only if before 2:00 PM
      bookings = await Booking.find({
        date: { $gte: currentTime.startOf("day").toISOString() },
      });
    } else {
      // Fetch tomorrow's bookings if it's after 2:00 PM
      bookings = await Booking.find({
        date: { $gte: currentTime.add(1, "days").startOf("day").toISOString() },
      });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings_report.pdf');

    doc.pipe(res);

    // Title of the document
    doc.fontSize(20).text("Bookings Report", { align: 'center' });
    doc.moveDown();

    // Table layout settings
    const startX = 50;  // Starting x position
    const startY = 100;  // Starting y position (after the title)
    const columnWidth = 80;  // Width of each column
    const signColumnWidth = 100;  // Width of "Sign" column
    const rowHeight = 40;  // Height of each row (for spacing)
    const totalWidth = columnWidth * 5 + signColumnWidth;  // Total table width (with sign column)

    // Draw a box around the whole table (includes headers and rows)
    doc.rect(startX - 10, startY - 10, totalWidth + 20, (bookings.length * rowHeight) + 60).stroke();  // Adding box around the whole table with extra space

    // Define header columns
    const headers = ['Name', 'PS Number', 'Meal', 'Department', 'Date', 'Sign'];
    let xPosition = startX;

    // Draw the headers, and align text to the center of each field
    headers.forEach((header, index) => {
      doc.fontSize(12).text(header, xPosition, startY, { width: index === 5 ? signColumnWidth : columnWidth, align: 'center' });
      xPosition += (index === 5) ? signColumnWidth : columnWidth;
    });

    // Horizontal line after the header row
    doc.moveTo(startX - 10, startY + rowHeight).lineTo(startX + totalWidth + 10, startY + rowHeight).stroke();

    let yPosition = startY + rowHeight;  // Start drawing rows after the header

    // Loop through bookings and add them to the table
    bookings.forEach((booking) => {
      xPosition = startX;

      // Add each field, ensuring text is centered in the field with padding
      doc.text(booking.name, xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;

      doc.text(booking.psNumber, xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;

      doc.text(booking.meal, xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;

      doc.text(booking.department, xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;

      // Format date to show only the date (without time)
      const formattedDate = moment(booking.date).format('YYYY-MM-DD');
      doc.text(formattedDate, xPosition, yPosition + 10, { width: columnWidth, align: 'center' });
      xPosition += columnWidth;

      // "Sign" column (empty for signatures)
      doc.text('', xPosition, yPosition + 10, { width: signColumnWidth, align: 'center' });

      // Move to the next row
      yPosition += rowHeight;

      // Draw horizontal line after each row
      doc.moveTo(startX - 10, yPosition).lineTo(startX + totalWidth + 10, yPosition).stroke();
    });

    // Draw final closing line at the bottom (after the last row)
    doc.moveTo(startX - 10, yPosition).lineTo(startX + totalWidth + 10, yPosition).stroke();

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
});

module.exports = router;
