import React from "react";
import { Link } from "react-router-dom";
import "./BackButtonProposal.css"; // We'll update this CSS

// We'll simplify the props, as 'title' will no longer be part of this component's render
const BackButtonProposal = ({ to = "/dao", imgSrc = "/button.svg" }) => (
  // The outer div 'form-navigationProposal' should now be the container for the entire header,
  // so we won't wrap just the back button in it here.
  // This component will ONLY render the back button link.
  <Link to={to} className="backButtonProposal">
    <img
      src={imgSrc}
      alt="Back" // Still important for accessibility
      className="backIconProposal" // Keep this class for sizing/styling
    />
  </Link>
);

export default BackButtonProposal;