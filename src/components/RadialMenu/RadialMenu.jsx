import React, { useState } from 'react';
import './RadialMenu.css';

const RadialMenu = () => {
  const [isOpen, setIsOpen] = useState(true); // Always open when component is rendered
  const [isClosing, setIsClosing] = useState(false);

  React.useEffect(() => {
    document.body.classList.add('radial-menu-active');
    return () => document.body.classList.remove('radial-menu-active');
  }, []);

  const handleMouseLeave = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
    }, 600); // Match animation duration
  };

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: '/menu-profile-icon.svg', position: 'left-top', route: '/profile' },
    { id: 'about', label: 'About', icon: '/openwork-job-icon.svg', position: 'right-top', route: '/about' },
    { id: 'jobs', label: 'Jobs', icon: '/menu-work-icon.svg', position: 'left-middle', route: '/browse-jobs' },
    { id: 'governance', label: 'Governance', icon: '/menu-governance-icon.svg', position: 'right-middle', route: '/governance' },
    { id: 'home', label: 'Home', icon: '/menu-home-icon.svg', position: 'center-bottom', route: '/' },
  ];

  const handleMenuClick = (route) => {
    window.location.pathname = route;
  };

  return (
    <div 
      onMouseLeave={handleMouseLeave}
    >
      <div className={`radial-menu-wrapper ${isOpen ? 'menu-open' : ''} ${isClosing ? 'menu-closing' : ''}`}>
        {/* Large Background Circle from Figma */}
        <div className="menu-background-circle">
          <img src="/menu-circle.svg" alt="" />
        </div>


        {/* Menu Text */}
        <span className="menu-text">MENU</span>
        
        <div className="radial-menu-items">
          {menuItems.map((item) => (
            <div
              key={item.id}
              id={item.id}
              className={`radial-menu-item ${item.position}`}
              onClick={() => handleMenuClick(item.route)}
            >
              <div className="menu-item-icon">
                <img src={item.icon} alt={item.label} />
              </div>
              <div className="menu-item-label">{item.label}</div>
            </div>
          ))}
        </div>

        <div className="hover-instruction">Hover to navigate</div>
      </div>
    </div>
  );
};

export default RadialMenu;
