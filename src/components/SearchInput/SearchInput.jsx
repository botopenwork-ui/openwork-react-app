import React from 'react';
import './SearchInput.css';

const SearchInput = ({ placeholder = "Search" }) => {
  return (
    <div className="search-input">
      <img src="/search.svg" alt="" className='search-icon'/>
      <input type="text" className="input-field" placeholder={placeholder} />
    </div>
  );
};

export default SearchInput;
