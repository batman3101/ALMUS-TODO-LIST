import React from 'react';
import { StagewiseToolbar } from '@stagewise/toolbar-react';
import { ReactPlugin } from '@stagewise-plugins/react';

const StagewiseToolbarComponent: React.FC = () => {
  return (
    <StagewiseToolbar
      config={{
        plugins: [ReactPlugin],
      }}
    />
  );
};

export default StagewiseToolbarComponent;
