import React from "react";
import './Timeline.css';
import Collapse from "../../components/Collapse/Collapse";
import { timelineData } from "./timelineData";

function TaskItem({ task, index, isLast }) {
    return (
        <>
            <div className="timeline-task-item">
                <div className="timeline-task-header">
                    <div className="timeline-task-name">{task.name}</div>
                    {task.date && (
                        <div className="timeline-task-date">{task.date}</div>
                    )}
                </div>
                {task.description && (
                    <div className="timeline-task-description">
                        {task.description}
                    </div>
                )}
            </div>
            {!isLast && <span className="timeline-task-divider"></span>}
        </>
    );
}

function ChecklistSection({ title, tasks }) {
    const content = (
        <div className="timeline-tasks-container">
            {tasks.map((task, index) => (
                <TaskItem 
                    key={index} 
                    task={task} 
                    index={index}
                    isLast={index === tasks.length - 1}
                />
            ))}
        </div>
    );

    return (
        <div className="timeline-checklist-section">
            <Collapse title={title} content={content} />
        </div>
    );
}

export default function Timeline() {
    return (
        <div className="timeline-page-wrapper">
            <div className="timeline-form">
                <div className="timeline-title">
                    <img src="/alarm.svg" alt="Timeline" style={{ width: '32px', height: '32px', marginRight: '12px' }}/>
                    <span>OpenWork Launch Timeline</span>
                </div>
                <div className="timeline-subtitle">
                    <span>Development roadmap and completion checklists for the OpenWork platform launch</span>
                </div>
                
                <div className="timeline-checklists">
                    <ChecklistSection 
                        title={timelineData.webApp.title}
                        tasks={timelineData.webApp.tasks}
                    />
                    <span className="timeline-section-divider"></span>
                    
                    <ChecklistSection 
                        title={timelineData.landingPage.title}
                        tasks={timelineData.landingPage.tasks}
                    />
                    <span className="timeline-section-divider"></span>
                    
                    <ChecklistSection 
                        title={timelineData.contract.title}
                        tasks={timelineData.contract.tasks}
                    />
                </div>
            </div>
        </div>
    );
}
