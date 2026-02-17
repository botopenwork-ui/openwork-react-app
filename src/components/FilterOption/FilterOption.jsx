import React, { useState } from 'react';
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
  const [selectedOption, setSelectedOption] = useState(label);

  const toggleDropdown = (e) => {
    e.preventDefault();
    setIsOpen(!isOpen);
  }

  const handleColumnToggle = (columnId) => {
    if (onColumnToggle) {
      onColumnToggle(columnId);
    }
  };

  const isColumnSelected = (columnId) => {
    return selectedColumns.includes(columnId);
  };

  const isColumnDisabled = (columnId) => {
    const column = allColumns.find(col => col.id === columnId);
    if (column?.required) return true;
    
    const selectedCount = selectedColumns.length;
    const isSelected = isColumnSelected(columnId);
    
    // Can't deselect if at minimum (4)
    if (isSelected && selectedCount <= 4) return true;
    
    // Can't select if at maximum (6)
    if (!isSelected && selectedCount >= 6) return true;
    
    return false;
  };

  return (
    <div className="dropdown">
      <button className={`dropdown-toggle ${customCSS}`} onClick={toggleDropdown}>
        {label}
        <img src={selectedOption == 'Filter'?'/filter.svg':'/array.svg'} alt="" />
      </button>
      {isOpen && (
        <ul className="filter-dropdown-menu">
          {isColumnSelector ? (
            // Column selector mode
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
            // Regular filter mode
            options.map((option, index) => (
              <React.Fragment key={index}>
                <li className="dropdown-item">
                  <ComboBox 
                    label={option}
                    isChecked={selectedFilter === option}
                    onChange={() => onFilterChange && onFilterChange(option)}
                  />
                </li>
                {index !== options.length - 1 && <span className='dropdown-line'/>}
              </React.Fragment>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default FilterOption;
