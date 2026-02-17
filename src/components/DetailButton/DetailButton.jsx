import React from "react";
import { Link } from "react-router-dom";
import "./DetailButton.css";

const DetailButton = ({ to = "/", title, imgSrc = "/view.svg" }) => (
    <Link to={to} className="details">
      <img
        src={imgSrc}
        alt="Back"
        
      />
      {title && <span>{title}</span>}
    </Link>
);

export default DetailButton;
