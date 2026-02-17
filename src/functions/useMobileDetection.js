import { useState, useEffect } from "react";

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      if (/android|iphone|ipad|ipod|windows phone/i.test(userAgent)) {
        setIsMobile(true);
      }
    };
    checkMobile();
  }, []);

  return isMobile;
}
