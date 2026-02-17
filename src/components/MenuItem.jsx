import React from "react";
import { Link } from "react-router-dom";

const MenuItem = ({
  to,
  id,
  buttonsVisible,
  buttonFlex,
  onMouseEnter,
  onMouseLeave,
  imgSrc,
  iconSrc,
  text
}) => (
  <Link
    to={to}
    id={id}
    className={`buttonContainer-home ${buttonsVisible ? "visible-home" : ""}`}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{ display: buttonFlex ? "flex" : undefined }}
  >
    <img src={imgSrc} alt="Button Right" className="buttonImage-home" />
    <img src={iconSrc} alt="Icon" className="buttonIcon-home" />
    <span className="buttonText-home2">{text}</span>
  </Link>
);

export default MenuItem;
