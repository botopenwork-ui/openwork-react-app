import { useState, useEffect } from "react";

export function useHoverEffect() {
  const [hovering, setHovering] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const [buttonFlex, setButtonFlex] = useState(false);

  useEffect(() => {
    const coreHome = document.getElementById('core-home');

    const handleMouseEnter = () => {
      setButtonFlex(true);
    };

    if (coreHome) {
      coreHome.addEventListener('mouseenter', handleMouseEnter, { once: true });
    }

    return () => {
      if (coreHome) {
        coreHome.removeEventListener('mouseenter', handleMouseEnter);
      }
    };
  }, []);

  return { hovering, setHovering, buttonsVisible, setButtonsVisible, buttonFlex };
}
