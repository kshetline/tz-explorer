const { version } = require('../package.json');

export const TZE_VERSION = version;
export const BACK_IN_TIME_THRESHOLD = 3000;

export interface CurrentDelta {
  delta: number;
  dut1: number[] | null;
  pendingLeap: number;
  pendingLeapDate: string;
}

export interface TimeInfo {
  time: number;
  leapSecond: number;
  leapExcess: number;
  text: string;
}
