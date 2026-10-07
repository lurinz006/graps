import React from 'react';

export default function GrapsLogo({ className = "" }) {
  return (
    <svg 
      viewBox="0 0 320 60" 
      className={`w-full h-full object-contain ${className}`} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@900&display=swap');
            .logo-text {
              font-family: 'Orbitron', sans-serif;
              font-weight: 900;
              fill: #d4af37;
              letter-spacing: 4px;
            }
          `}
        </style>
      </defs>
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" className="logo-text" fontSize="46">
        G-CRAPS
      </text>
    </svg>
  );
}
