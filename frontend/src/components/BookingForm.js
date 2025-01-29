import React, { useState, useEffect } from "react";
import axios from "axios";
import './BookingForm.css';

const BookingForm = () => {
  const [name, setName] = useState("");
  const [psNumber, setPsNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [meal, setMeal] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState(""); // For error messages

  useEffect(() => {
    const currentTime = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(9, 30, 0, 0); // 9:30 AM local time

    let bookingDate = new Date(); // Start with today’s date

    // If the current time is past 9:30 AM, set the date to the next day
    if (currentTime > cutoffTime) {
      bookingDate.setDate(bookingDate.getDate() + 1);
      setError("It is past 9:30 AM. The booking is for the next day.");
    } else {
      setError(""); // Clear any error messages
    }

    // Convert to YYYY-MM-DD format in local time
    const formattedDate = bookingDate.toLocaleDateString("en-CA"); // 'en-CA' ensures YYYY-MM-DD format
    setDate(formattedDate);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare the booking data
    const newBooking = {
      name,
      psNumber,
      department,
      meal,
      date,
    };

    // Submit the booking to the backend
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/bookings`, newBooking);
      console.log("Booking submitted:", response.data);
      alert("Booking submitted successfully!");
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("Failed to submit booking.");
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          PS Number:
          <input
            type="text"
            value={psNumber}
            onChange={(e) => setPsNumber(e.target.value)}
            required
          />
        </label>
        <label>
          Department:
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />
        </label>
        <label>
          Meal:
          <select value={meal} onChange={(e) => setMeal(e.target.value)} required>
            <option value="" disabled>Select a meal</option>
            <option value="Lunch">Lunch</option>
          </select>
        </label>

        <label>
          Date:
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            disabled // Disable manual date changes
          />
        </label>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Submit Booking</button>
      </form>
    </div>
  );
};

export default BookingForm;
