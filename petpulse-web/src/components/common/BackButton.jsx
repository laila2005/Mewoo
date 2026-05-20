import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ className = '', label = 'Back', to }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (to) {
            navigate(to);
        } else {
            navigate(-1);
        }
    };

    return (
        <button 
            onClick={handleClick} 
            className={`flex items-center gap-1.5 text-slate-500 hover:text-blue-600 font-bold transition-colors w-max group ${className}`}
        >
            <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            {label}
        </button>
    );
};

export default BackButton;
