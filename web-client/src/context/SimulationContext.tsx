import React, { createContext, useContext, useEffect, useState } from 'react';
import type { SimulationState } from '../services/liveSimulation';
import { simulationManager } from '../services/liveSimulation';

interface SimulationContextType extends SimulationState {
  toggleSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simState, setSimState] = useState<SimulationState>(simulationManager.getState());

  useEffect(() => {
    const unsubscribe = simulationManager.subscribe(state => {
      setSimState(state);
    });
    return unsubscribe;
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        ...simState,
        toggleSimulation: () => simulationManager.toggleSimulation()
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within a SimulationProvider');
  return ctx;
};
