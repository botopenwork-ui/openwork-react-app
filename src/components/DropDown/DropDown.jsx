import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DropDown.css';

const DropDown = ({ label, options, customCSS, width, onOptionSelect }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(label);

  const toggleDropdown = (e) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  }

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
    
    // Handle navigation based on option
    if (onOptionSelect) {
      onOptionSelect(option);
    } else if (typeof option === 'string') {
      // Map view names to routes
      const routeMap = {
        'Jobs View': '/browse-jobs',
        'Skill Oracle View': '/skill-oracles',
        'Talent View': '/browse-talent',
        'DAO View': '/dao',
        'People': '/browse-talent',
        // 'Packages': '/profile-packages', // Delinked - kept for reference
        'Oracles': '/skill-oracles',
        'Members': '/members-skill-oracles',
        'Disputes': '/skill-oracle-disputes',
        'Proposals/Applications': '/skill-oracle-proposals',
        'Proposals': '/skill-oracle-proposals',
        'Listings': '/browse-jobs',
        'Initiated': '/profile-jobs',
        'Applications': '/application-jobs'
      };

      // Handle DAO context specifically
      if (option === 'Members' && window.location.pathname.includes('/dao')) {
        navigate('/dao-members');
        return;
      }

      if (option === 'Proposals' && window.location.pathname.includes('/dao')) {
        navigate('/dao');
        return;
      }

      // Handle Skill Oracle context for Applications
      if (option === 'Applications' && (
        window.location.pathname.includes('/skill-oracle') ||
        window.location.pathname.includes('/members-skill-oracle') ||
        window.location.pathname.includes('/skill-oracles') ||
        window.location.pathname.includes('/ask-athena')
      )) {
        navigate('/skill-oracle-applications');
        return;
      }

      // Handle Ask Athena context
      if (option === 'Ask Athena' && (
        window.location.pathname.includes('/skill-oracle') ||
        window.location.pathname.includes('/members-skill-oracle') ||
        window.location.pathname.includes('/skill-oracles') ||
        window.location.pathname.includes('/ask-athena')
      )) {
        navigate('/ask-athena-applications');
        return;
      }
      
      if (routeMap[option]) {
        navigate(routeMap[option]);
      }
    }
  };

  return (
    <div className="dropdown" style={{width: `${width?'100%':''}`}}>
      <button className={`dropdown-toggle ${customCSS}`} onClick={toggleDropdown}>
        {
          selectedOption.img ?
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <img src={selectedOption.img} alt="" />
            <span>{selectedOption.label}</span>
          </div>
           :
          <>
            {selectedOption}
          </>
        }
        <img src={selectedOption == 'Filter'?'/filter.svg':'/array.svg'} alt="" />
      </button>
      {isOpen && (
        <ul className="dropdown-menu">
          {options.map((option, index) => (
            <React.Fragment key={index}>
              <li
                className="dropdown-item"
                onClick={() => handleOptionClick(option)}
              >
                {option.img ? (
                  <>
                    <img src={option.img}/> <span>{option.label}</span>
                  </>
                  ):<span>{option}</span>}
              </li>
              {index !=options.length-1 &&<span className='dropdown-line'/>}
            </React.Fragment>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropDown;
