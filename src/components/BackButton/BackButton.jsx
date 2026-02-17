import React from "react";
import { Link } from "react-router-dom";
import "./BackButton.css";

const BackButton = ({ to = "/", title = "Back", imgSrc = "/button.svg", style }) => (
  <div className="form-navigationDC" style={style}>
    <Link to={to} className="backButtonDC">
      <img
        src={imgSrc}
        alt="Back"
        className="backIconDC"
      />
    </Link>
    <div className="formTitleDC" title={title}>{title}</div>
    <Link to={to} className="backButtonDC" style={{visibility: 'hidden'}}>
      <img
        src={imgSrc}
        alt="Back"
        className="backIconDC"
      />
    </Link>
  </div>
);

export default BackButton;
