import React from "react";
import "./ProjectComplete.css"
import BlueButton from "../../components/BlueButton/BlueButton";

export default function ProjectComplete() {
    return (
        <div className="complete-from">
            <div className="success-icon">
                <img src="/check-circle.png" alt="" />
            </div>
            <div className="success-letter">
                <span>Success!</span>
            </div>
            <div className="success-description">
                <span>Looks like this project was a great success! Please drop a rating for this freelancer</span>
            </div>
            <div className="success-star">
                <div className="success-star-icons">
                    {[...Array(5)].map((_, index) => (
                        <img key={index} src="/star.png" alt="star" />
                    ))}
                </div>
                <div className="star-letter">
                    <span>5 stars</span>
                </div>
            </div>
            <BlueButton label="Submit Rating" style={{width: '100%', justifyContent: 'center'}}/>
        </div>
    )
}