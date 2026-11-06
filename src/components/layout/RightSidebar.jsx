import React from 'react';
import { FriendActivity } from '../FriendActivity';

export const RightSidebar = () => {
  return (
    <aside className="w-80 hidden lg:flex flex-col z-10 bg-[#0a0a0a] border-l border-white/5 h-[calc(100vh-96px)] overflow-y-auto scrollbar-hide relative">
      <div className="p-6 pt-10">
        <FriendActivity />
      </div>
    </aside>
  );
};

export default RightSidebar;
