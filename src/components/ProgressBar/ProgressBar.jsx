import React from "react";
import "./ProgressBar.css";

const ProgressBar = ({ percent, width, color }) => {
  let backgroundColor;

  // Use provided color or default color logic
  if (color) {
    backgroundColor = color;
  } else if (percent < 50) {
    backgroundColor = "#F44336";
  } else if (percent < 90) {
    backgroundColor = "#FFA500";
  } else {
    backgroundColor = "#00C853";
  }

  return (
    <div className="progress-bar-container" style={{width: width}}>
        <div className="progress-bar-track">
            <div
                className="progress-bar-fill"
                style={{
                    width: `${percent}%`,
                    backgroundColor: backgroundColor
                }}
            />
        </div>
        <span className="progress-percentage">{percent}%</span>
    </div>
  );
};

export default ProgressBar;
