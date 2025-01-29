import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Admin.css';
const Admin = () => {
    const [bookings, setBookings] = useState([]);
    const [counts, setCounts] = useState({ breakfast: 0, lunch: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login'); // Redirect if not logged in
            return;
        }

        const fetchBookings = async () => {
            try {
                const response = await axios.get("http://localhost:5000/bookings", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setBookings(response.data);

                const breakfastCount = response.data.filter(b => b.meal === 'Breakfast').length;
                const lunchCount = response.data.filter(b => b.meal === 'Lunch').length;
                setCounts({ breakfast: breakfastCount, lunch: lunchCount });
            } catch (error) {
                console.error('Error fetching bookings:', error);
            }
        };

        fetchBookings();
    }, [navigate]);

    const downloadPDF = async () => {
        try {
          const response = await axios.get("http://localhost:5000/bookings/download", {
            responseType: 'blob',
          });
      
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', 'bookings_report.pdf');
          document.body.appendChild(link);
          link.click();
        } catch (error) {
          console.error('Error downloading PDF:', error);
        }
      };
      
      
    return (
        <div>
            <h1>Admin Panel</h1>
            <h2>Booking Counts</h2>
            <p>Breakfast: {counts.breakfast}</p>
            <p>Lunch: {counts.lunch}</p>

            <button onClick={downloadPDF}>Download Bookings as PDF</button>

            <h2>All Bookings</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>PS Number</th>
                        <th>Meal</th>
                        <th>Department</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {bookings.map((booking) => (
                        <tr key={booking._id}>
                            <td>{booking.name}</td>
                            <td>{booking.psNumber}</td>
                            <td>{booking.meal}</td>
                            <td>{booking.department}</td>
                            <td>{new Date(booking.date).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Admin;
