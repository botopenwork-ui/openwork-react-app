import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './FilterOption.css';
import ComboBox from '../ComboBox/ComboBox';

const FilterOption = ({ 
  label, 
  options, 
  customCSS, 
  isColumnSelector = false,
  selectedColumns = [],
  onColumnToggle,
  allColumns = [],
  selectedFilter = 'All',
  onFilterChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const openMenu = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      zIndex: 100000,
    });
    setIsOpen(true);
  };

  const closeMenu = () => setIsOpen(false);

  const toggleDropdown = (e) => {
    e.preventDefault();
    isOpen ? closeMenu() : openMenu();
  };

  // Close on outside click or scroll
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      const inButton = buttonRef.current && buttonRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inButton && !inMenu) closeMenu();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', closeMenu, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', closeMenu, true);
    };
  }, [isOpen]);

  const handleColumnToggle = (columnId) => {
    if (onColumnToggle) onColumnToggle(columnId);
    // Column selector stays open for multi-toggle
  };

  const handleFilterChange = (option) => {
    if (onFilterChange) onFilterChange(option);
    closeMenu(); // Filter closes after selection
  };

  const isColumnSelected = (columnId) => selectedColumns.includes(columnId);

  const isColumnDisabled = (columnId) => {
    const column = allColumns.find(col => col.id === columnId);
    if (column?.required) return true;
    const selectedCount = selectedColumns.length;
    const isSelected = isColumnSelected(columnId);
    if (isSelected && selectedCount <= 4) return true;
    if (!isSelected && selectedCount >= 6) return true;
    return false;
  };

  const dropdownMenu = isOpen && ReactDOM.createPortal(
    <ul ref={menuRef} className="filter-dropdown-menu" style={menuStyle}>
      {isColumnSelector ? (
        allColumns.map((column, index) => (
          <React.Fragment key={column.id}>
            <li className="dropdown-item">
              <ComboBox 
                label={column.label} 
                isChecked={isColumnSelected(column.id)}
                onChange={() => handleColumnToggle(column.id)}
                disabled={isColumnDisabled(column.id)}
              />
            </li>
            {index !== allColumns.length - 1 && <span className='dropdown-line'/>}
          </React.Fragment>
        ))
      ) : (
        options.map((option, index) => (
          <React.Fragment key={index}>
            <li className="dropdown-item">
              <ComboBox 
                label={option}
                isChecked={selectedFilter === option}
                onChange={() => handleFilterChange(option)}
              />
            </li>
            {index !== options.length - 1 && <span className='dropdown-line'/>}
          </React.Fragment>
        ))
      )}
    </ul>,
    document.body
  );

  return (
    <div className="dropdown">
      <button ref={buttonRef} className={`dropdown-toggle ${customCSS}`} onClick={toggleDropdown}>
        {label}
        <img src={label === 'Filter' ? '/filter.svg' : '/array.svg'} alt="" />
      </button>
      {dropdownMenu}
    </div>
  );
};

export default FilterOption;
