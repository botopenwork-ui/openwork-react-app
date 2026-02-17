import { React, useState } from "react";
import StatusButton from "../StatusButton/StatusButton";
import "./Milestone.css";
import Button from "../Button/Button";

export default function Milestone({
    title,
    status,
    amount,
    date,
    content,
    editable,
    onUpdate,
    onDelete,
}) {
    const [open, setOpen] = useState(false);
    const [edit, setEdit] = useState(false);

    // Local state for editing
    const [editValues, setEditValues] = useState({
        title: title,
        content: content,
        amount: amount,
    });

    const handleEdit = () => {
        // Reset edit values to current props when starting edit
        setEditValues({
            title: title,
            content: content,
            amount: amount,
        });
        setEdit(true);
    };

    const handleSave = () => {
        // Call the onUpdate function for each field if provided
        if (onUpdate) {
            onUpdate("title", editValues.title);
            onUpdate("content", editValues.content);
            onUpdate("amount", editValues.amount);
        }
        setEdit(false);
    };

    const handleCancel = () => {
        // Reset to original values
        setEditValues({
            title: title,
            content: content,
            amount: amount,
        });
        setEdit(false);
    };

    const handleInputChange = (field, value) => {
        setEditValues((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    return (
        <>
            <div className="milestone">
                <div
                    className="milestone-header"
                    onClick={() => {
                        setOpen(!open);
                    }}
                >
                    <div className="milestone-header-content">
                        <div className="milestone-title">
                            <span>{title}</span>
                            {status && <StatusButton status={status} />}
                        </div>
                        <div className="milestone-amount">
                            <span>{amount}</span>
                            <img src="/xdc.svg" alt="" />
                            {date && (
                                <>
                                    <span>•</span>
                                    <span
                                        style={{
                                            fontSize: "14px",
                                            color: "#868686",
                                        }}
                                    >
                                        {date}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="arrow-icon">
                        <img
                            src={`/${open ? "arrayup.svg" : "array.svg"}`}
                            alt=""
                            width={10}
                            height={5}
                        />
                    </div>
                </div>
                {open && (
                    <div className="milestone-body">
                        <div className="milestone-body-line" />
                        <div className="milestone-body-content">{content}</div>
                        {editable && (
                            <>
                                <div className="milestone-body-line" />
                                <div className="edit-content">
                                    <Button
                                        label="Edit"
                                        buttonCss="editButton"
                                        icon="/edit.svg"
                                        onClick={handleEdit}
                                    />
                                    <Button
                                        buttonCss="editButton"
                                        icon="/delete.svg"
                                        onClick={onDelete}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            {edit && (
                <div
                    className="milestone"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 18,
                    }}
                >
                    <div className="profile-item">
                        <input
                            type="text"
                            value={editValues.title}
                            onChange={(e) =>
                                handleInputChange("title", e.target.value)
                            }
                            placeholder="Milestone Title"
                            className="milestone-title-edit-input"
                        />
                    </div>
                    <div>
                        <textarea
                            placeholder="Milestone Description"
                            value={editValues.content}
                            onChange={(e) =>
                                handleInputChange("content", e.target.value)
                            }
                            className="milestone-content-edit-textarea"
                        />
                    </div>
                    <div className="amountDC">
                        <input
                            id="amountInput"
                            type="number"
                            step="0.01"
                            placeholder="Amount"
                            value={editValues.amount}
                            onChange={(e) =>
                                handleInputChange(
                                    "amount",
                                    parseFloat(e.target.value) || 0,
                                )
                            }
                        />
                    </div>
                    <div className="lineDC"></div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            justifyContent: "flex-end",
                        }}
                    >
                        <Button
                            label={"Cancel"}
                            buttonCss={"editButton"}
                            onClick={handleCancel}
                        />
                        <Button
                            label={"Save"}
                            buttonCss={"editButton"}
                            onClick={handleSave}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
