import React from "react";
import { Link } from "react-router-dom";
import logo from './logo.png'; // Import logo from the same folder
import './Navbar.css'; // Importing the CSS file for styling

const Navbar = () => {
  return (
    <nav className="navbar">
      <img src={logo} alt="Logo" className="navbar-logo" /> {/* Logo */}
      <div className="navbar-links">
        <Link to="/" className="navbar-link">Home</Link>
        <Link to="/login" className="navbar-link">Admin</Link>  {/* Redirects to login first */}
      </div>
    </nav>
  );
};

export default Navbar;
