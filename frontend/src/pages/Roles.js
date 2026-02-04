import React from 'react';
import RolesManager from '../components/RolesManager';

const Roles = () => {
  return (
    <div className="animate-fade-in">
      <RolesManager embedded={false} />
    </div>
  );
};

export default Roles;
