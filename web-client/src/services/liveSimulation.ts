import type { AuditEvent } from '../types/system';

export interface SimulationState {
  isLive: boolean;
  tickCount: number;
  lastTickTime: string;
  totalActiveIncidents: number;
  liveQueryRate: number; // queries/sec
  recentEvents: AuditEvent[];
}

type SimulationListener = (state: SimulationState) => void;

class LiveSimulationManager {
  private isLive = true;
  private tickCount = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<SimulationListener> = new Set();
  private totalIncidents = 1820;
  private currentQueryRate = 42;

  private recentEvents: AuditEvent[] = [
    {
      id: 'SIM-EV-01',
      timestamp: 'Just now',
      actor: 'Cyber Security AI Guard',
      actorRole: 'ADMIN',
      action: 'API_CONFIG_EDIT',
      targetResource: 'Rate Limiter adjusted to 500 req/min',
      ipAddress: '10.14.0.1',
      severity: 'INFO',
      status: 'REVIEWED'
    }
  ];

  constructor() {
    this.startSimulation();
  }

  public startSimulation() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.isLive = true;
    this.intervalId = setInterval(() => this.tick(), 4000);
    this.notify();
  }

  public pauseSimulation() {
    this.isLive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.notify();
  }

  public toggleSimulation() {
    if (this.isLive) {
      this.pauseSimulation();
    } else {
      this.startSimulation();
    }
  }

  public subscribe(listener: SimulationListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): SimulationState {
    return {
      isLive: this.isLive,
      tickCount: this.tickCount,
      lastTickTime: new Date().toLocaleTimeString('en-IN', { hour12: false }),
      totalActiveIncidents: this.totalIncidents,
      liveQueryRate: this.currentQueryRate,
      recentEvents: this.recentEvents
    };
  }

  private tick() {
    if (!this.isLive) return;
    this.tickCount += 1;

    if (this.tickCount % 2 === 0) {
      this.totalIncidents += Math.floor(Math.random() * 2);
    }

    this.currentQueryRate = 38 + Math.floor(Math.random() * 15);

    if (this.tickCount % 3 === 0) {
      const simulatedActions = [
        { action: 'SUSPECT_SEARCH' as const, target: 'Mule Account #99104 Lookup', actor: 'Insp. Rajesh Kumar', role: 'INVESTIGATOR' as const, severity: 'INFO' as const },
        { action: 'DATA_EXPORT' as const, target: 'Hotspot Layer SVG render', actor: 'Analyst Meera Rao', role: 'ANALYST' as const, severity: 'INFO' as const },
        { action: 'CASE_OVERRIDE' as const, target: 'FIR-0421 Priority Escalated', actor: 'SP Ananda Murthy', role: 'SUPERVISOR' as const, severity: 'WARNING' as const },
        { action: 'PERMISSION_GRANT' as const, target: 'API Gateway token refresh', actor: 'System Admin', role: 'ADMIN' as const, severity: 'INFO' as const }
      ];

      const chosen = simulatedActions[this.tickCount % simulatedActions.length];
      const newEvent: AuditEvent = {
        id: `SIM-EV-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
        actor: chosen.actor,
        actorRole: chosen.role,
        action: chosen.action,
        targetResource: chosen.target,
        ipAddress: '10.14.4.' + (10 + (this.tickCount % 80)),
        severity: chosen.severity,
        status: 'REVIEWED'
      };

      this.recentEvents = [newEvent, ...this.recentEvents.slice(0, 7)];
    }

    this.notify();
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(fn => fn(state));
  }
}

export const simulationManager = new LiveSimulationManager();
