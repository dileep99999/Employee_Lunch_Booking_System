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
    cutoffTime.setHours(9, 30, 0, 0); // 9:30 AM of today

    // If the current time is past 9:30 AM, automatically set the date to the next day
    if (currentTime > cutoffTime) {
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
      setDate(nextDay.toISOString().split("T")[0]); // Set the date field to the next day
      setError("It is past 9:30 AM. The booking is for the next day.");
    } else {
      setDate(currentTime.toISOString().split("T")[0]); // Otherwise, set today's date
      setError(""); // Clear any error messages
    }
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
      const response = await axios.post("http://localhost:5000/bookings", newBooking);
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
        <select
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
          required
        >
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
            disabled={false} // Allow user to pick date if it's not changed automatically
          />
        </label>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Submit Booking</button>
      </form>
    </div>
  );
};

export default BookingForm;
