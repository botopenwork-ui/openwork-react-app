import { useEffect } from "react";

export function useButtonHover() {
  useEffect(() => {
    const hoverText = document.getElementById('hoverText-home');
    const buttonLeft = document.getElementById('buttonLeft-home');
    const buttonRight = document.getElementById('buttonRight-home');

    const handleButtonMouseEnter = () => {
      hoverText.style.display = 'none';
    };

    const handleButtonMouseLeave = () => {
      hoverText.style.display = 'block';
    };

    if (buttonLeft && buttonRight) {
      buttonLeft.addEventListener('mouseenter', handleButtonMouseEnter);
      buttonLeft.addEventListener('mouseleave', handleButtonMouseLeave);
      buttonRight.addEventListener('mouseenter', handleButtonMouseEnter);
      buttonRight.addEventListener('mouseleave', handleButtonMouseLeave);
    }

    return () => {
      if (buttonLeft && buttonRight) {
        buttonLeft.removeEventListener('mouseenter', handleButtonMouseEnter);
        buttonLeft.removeEventListener('mouseleave', handleButtonMouseLeave);
        buttonRight.removeEventListener('mouseenter', handleButtonMouseEnter);
        buttonRight.removeEventListener('mouseleave', handleButtonMouseLeave);
      }
    };
  }, []);
}
