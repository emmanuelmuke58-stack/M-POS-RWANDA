/**
 * Automatic Time Synchronization Service
 * 
 * Provides centralized, synchronized time keeping across the entire Fresh & More system.
 * - Synchronizes with reliable network time source (HTTP Date header / NTP offset)
 * - Automatically falls back to device clock when offline, with automatic resync on reconnection
 * - Enforces the configured business time zone (Default: Africa/Kigali, Rwanda, UTC+2)
 * - Supports 12-hour and 24-hour time format preferences
 * - Dispatches live seconds updates for real-time clocks in POS, Dashboards, and Reports
 */

export type TimeSyncStatus = 'synced' | 'syncing' | 'offline' | 'fallback';

export interface TimeSyncState {
  now: Date;
  offsetMs: number;
  status: TimeSyncStatus;
  lastSyncedAt: Date | null;
  timeZone: string;
  timeFormat: '12h' | '24h';
  isOnline: boolean;
}

export const SUPPORTED_TIMEZONES = [
  { id: 'Africa/Kigali', label: 'Kigali, Rwanda (CAT, UTC+2) - Default', offset: '+02:00' },
  { id: 'Africa/Nairobi', label: 'Nairobi, Kenya (EAT, UTC+3)', offset: '+03:00' },
  { id: 'Africa/Johannesburg', label: 'Johannesburg, South Africa (SAST, UTC+2)', offset: '+02:00' },
  { id: 'Africa/Cairo', label: 'Cairo, Egypt (EET, UTC+2)', offset: '+02:00' },
  { id: 'Africa/Lagos', label: 'Lagos, Nigeria (WAT, UTC+1)', offset: '+01:00' },
  { id: 'UTC', label: 'Coordinated Universal Time (UTC)', offset: '+00:00' },
  { id: 'Europe/London', label: 'London, UK (GMT/BST)', offset: '+00:00' },
  { id: 'Europe/Paris', label: 'Paris, France (CET, UTC+1)', offset: '+01:00' },
  { id: 'Asia/Dubai', label: 'Dubai, UAE (GST, UTC+4)', offset: '+04:00' },
  { id: 'America/New_York', label: 'New York, USA (EST/EDT)', offset: '-05:00' },
];

class TimeSyncManager {
  private offsetMs: number = 0;
  private status: TimeSyncStatus = 'syncing';
  private lastSyncedAt: Date | null = null;
  private timeZone: string = 'Africa/Kigali';
  private timeFormat: '12h' | '24h' = '24h';
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncTimer: any = null;
  private tickTimer: any = null;
  private listeners: Set<(state: TimeSyncState) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Load saved preferences
    try {
      const savedZone = localStorage.getItem('fresh_timezone');
      if (savedZone) this.timeZone = savedZone;
      const savedFmt = localStorage.getItem('fresh_timeformat');
      if (savedFmt === '12h' || savedFmt === '24h') this.timeFormat = savedFmt;
      const savedOffset = localStorage.getItem('fresh_time_offset');
      if (savedOffset) this.offsetMs = parseInt(savedOffset, 10) || 0;
    } catch {
      // ignore localStorage errors
    }

    // Set online/offline listeners
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.status = 'offline';
      this.notifyListeners();
    });

    // Start 1-second ticker for live displays
    this.tickTimer = setInterval(() => {
      this.notifyListeners();
    }, 1000);

    // Initial sync
    this.syncNow();

    // Periodic background sync every 3 minutes
    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.syncNow();
      }
    }, 3 * 60 * 1000);
  }

  public async syncNow(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (!navigator.onLine) {
      this.isOnline = false;
      this.status = 'offline';
      this.notifyListeners();
      return false;
    }

    this.status = 'syncing';
    this.notifyListeners();

    try {
      // 1. Primary: Authoritative Backend Time API with RTT / 2 latency calibration
      try {
        const startTime = performance.now();
        const apiRes = await fetch('/api/time?_t=' + Date.now(), {
          cache: 'no-store',
          signal: AbortSignal.timeout(3000),
        });
        if (apiRes.ok) {
          const endTime = performance.now();
          const rtt = endTime - startTime;
          const data = await apiRes.json();
          if (data && typeof data.timestamp === 'number') {
            const estimatedServerTime = data.timestamp + Math.round(rtt / 2);
            const localTime = Date.now();
            this.offsetMs = estimatedServerTime - localTime;
            this.status = 'synced';
            this.lastSyncedAt = new Date();
            try {
              localStorage.setItem('fresh_time_offset', this.offsetMs.toString());
            } catch {}
            this.notifyListeners();
            return true;
          }
        }
      } catch {
        // Continue to secondary methods
      }

      // 2. Secondary: HTTP HEAD Date header
      const startTime = performance.now();
      const res = await fetch(window.location.origin + '?_ts=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });

      const endTime = performance.now();
      const rtt = endTime - startTime;
      const dateHeader = res.headers.get('date');

      if (dateHeader) {
        const serverTimestamp = new Date(dateHeader).getTime();
        if (!isNaN(serverTimestamp)) {
          // Adjust for half-RTT network latency
          const estimatedServerTime = serverTimestamp + Math.round(rtt / 2);
          const localTime = Date.now();
          this.offsetMs = estimatedServerTime - localTime;
          this.status = 'synced';
          this.lastSyncedAt = new Date();
          try {
            localStorage.setItem('fresh_time_offset', this.offsetMs.toString());
          } catch {}
          this.notifyListeners();
          return true;
        }
      }

      // 3. Tertiary: Public Time API (Kigali timezone reference)
      const publicRes = await fetch('https://worldtimeapi.org/api/timezone/Africa/Kigali', {
        cache: 'no-store',
        signal: AbortSignal.timeout(3500),
      });

      if (publicRes.ok) {
        const data = await publicRes.json();
        if (data.datetime) {
          const apiTimestamp = new Date(data.datetime).getTime();
          this.offsetMs = apiTimestamp - Date.now();
          this.status = 'synced';
          this.lastSyncedAt = new Date();
          try {
            localStorage.setItem('fresh_time_offset', this.offsetMs.toString());
          } catch {}
          this.notifyListeners();
          return true;
        }
      }

      // 4. Fallback: local device clock with saved offset calibration
      this.status = 'fallback';
      this.lastSyncedAt = new Date();
      this.notifyListeners();
      return true;
    } catch {
      // Offline or network error
      this.status = this.isOnline ? 'fallback' : 'offline';
      this.notifyListeners();
      return false;
    }
  }

  public getNow(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  public getState(): TimeSyncState {
    return {
      now: this.getNow(),
      offsetMs: this.offsetMs,
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      timeZone: this.timeZone,
      timeFormat: this.timeFormat,
      isOnline: this.isOnline,
    };
  }

  public setTimeZone(zone: string) {
    this.timeZone = zone;
    try {
      localStorage.setItem('fresh_timezone', zone);
    } catch {}
    this.notifyListeners();
  }

  public setTimeFormat(fmt: '12h' | '24h') {
    this.timeFormat = fmt;
    try {
      localStorage.setItem('fresh_timeformat', fmt);
    } catch {}
    this.notifyListeners();
  }

  public subscribe(cb: (state: TimeSyncState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((cb) => cb(state));
  }

  /**
   * Format ISO Date string in target timeZone: YYYY-MM-DD
   */
  public getTodayString(tz: string = this.timeZone): string {
    const now = this.getNow();
    return this.formatDateISO(now, tz);
  }

  public getYesterdayString(tz: string = this.timeZone): string {
    const yesterday = new Date(this.getNow().getTime() - 24 * 60 * 60 * 1000);
    return this.formatDateISO(yesterday, tz);
  }

  public getDateDaysAgo(days: number, tz: string = this.timeZone): string {
    const target = new Date(this.getNow().getTime() - days * 24 * 60 * 60 * 1000);
    return this.formatDateISO(target, tz);
  }

  public formatDateISO(dateInput?: Date | string | number, tz: string = this.timeZone): string {
    const d = dateInput === undefined ? this.getNow() : typeof dateInput === 'object' ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(d);
    } catch {
      return d.toISOString().split('T')[0];
    }
  }

  /**
   * Format Time: HH:mm (24h) or hh:mm a (12h)
   */
  public formatTime(
    dateInput: Date | string | number = this.getNow(),
    tz: string = this.timeZone,
    format: '12h' | '24h' = this.timeFormat,
    includeSeconds: boolean = false
  ): string {
    const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined,
        hour12: format === '12h',
      });
      return formatter.format(d);
    } catch {
      return d.toTimeString().slice(0, includeSeconds ? 8 : 5);
    }
  }

  /**
   * Format Display Date (e.g. "Wed, Oct 14, 2026")
   */
  public formatDisplayDate(
    dateInput: Date | string | number = this.getNow(),
    tz: string = this.timeZone,
    options: { weekday?: 'short' | 'long' | 'none'; includeYear?: boolean } = {}
  ): string {
    const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: options.weekday === 'none' ? undefined : options.weekday || 'short',
        month: 'short',
        day: 'numeric',
        year: options.includeYear !== false ? 'numeric' : undefined,
      });
      return formatter.format(d);
    } catch {
      return d.toDateString();
    }
  }

  /**
   * Format full timestamp for audit logs and ledger entries (YYYY-MM-DD HH:mm:ss)
   */
  public formatTimestamp(
    dateInput: Date | string | number = this.getNow(),
    tz: string = this.timeZone
  ): string {
    const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const datePart = this.formatDateISO(d, tz);
    const timePart = this.formatTime(d, tz, '24h', true);
    return `${datePart} ${timePart}`;
  }
}

export const timeSync = new TimeSyncManager();
