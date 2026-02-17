import { useState } from "react";

export function useDropdown() {
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const toggleDropdown = () => {
    setDropdownVisible(!dropdownVisible);
  };

  return { dropdownVisible, toggleDropdown };
}
