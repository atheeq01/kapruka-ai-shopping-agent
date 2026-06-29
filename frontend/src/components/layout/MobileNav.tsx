import React from 'react';
import { Home, Search, Heart, User, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export const MobileNav: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white/80 backdrop-blur-xl border-t border-gray-100 z-40 pb-[env(safe-area-inset-bottom)] flex items-center justify-around px-2">
      <NavItem icon={<Home size={24} />} label="Home" onClick={() => navigate('/')} active />
      <NavItem icon={<Search size={24} />} label="Search" />
      <NavItem icon={<Clock size={24} />} label="Orders" />
      <NavItem icon={<Heart size={24} />} label="Wishlist" />
      <NavItem icon={<User size={24} />} label="Profile" />
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void; active?: boolean }> = ({ icon, label, onClick, active }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center justify-center w-full h-full gap-1 transition-colors',
      active ? 'text-pink-500' : 'text-gray-400 hover:text-gray-600'
    )}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);
