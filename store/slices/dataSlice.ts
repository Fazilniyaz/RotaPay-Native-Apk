// store/slices/dataSlice.ts
// ─────────────────────────────────────────────
// Central Redux cache for every feature module (shifts, wages, employers,
// calendar, clock, paid months, analytics).
//
// Previously each screen fetched its own data on focus, so hopping between tabs
// re-hit the API and showed a spinner every time. This slice loads ALL modules
// ONCE right after login (dispatched from the (app) layout), keeps it in the
// store, and lets every screen render instantly from it while a silent refresh
// keeps it current. The whole cache is wiped on logout by the root reducer
// (see store/index.ts) so no data bleeds into the next session.
// ─────────────────────────────────────────────
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Shift, Employer, Salary, CalendarEntry, ClockSession } from '../../lib/types';
import { listShifts, getShiftAnalytics, ShiftAnalytics } from '../../lib/services/shifts';
import { listEmployers, setDefaultEmployer as apiSetDefaultEmployer } from '../../lib/services/employers';
import { listSalaries } from '../../lib/services/salaries';
import { listCalendar } from '../../lib/services/calendar';
import { listClock } from '../../lib/services/clock';
import { listPaidMonths, PaidMonth } from '../../lib/services/payments';

// Generous calendar window so the dashboard (looks a couple of months back and
// ~2 ahead) and the calendar screen both have data without an extra request.
function calendarWindow(): { from: string; to: string } {
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  const to = new Date();
  to.setMonth(to.getMonth() + 6);
  return { from: from.toISOString(), to: to.toISOString() };
}

interface DataState {
  shifts: Shift[];
  employers: Employer[];
  wages: Salary[];
  calendar: CalendarEntry[];
  clock: ClockSession[];
  paidMonths: PaidMonth[];
  analytics: ShiftAnalytics | null;
  // The employee scoping calendar / earnings / reports. Null → onboarding.
  defaultEmployerId: string | null;
  loaded: boolean;
  loading: boolean;
  // True once employers alone have arrived. The onboarding gate keys off this so
  // it can decide immediately, instead of waiting for the full seven-module
  // preload (`loaded`) to finish.
  employersLoaded: boolean;
}

const initialState: DataState = {
  shifts: [],
  employers: [],
  wages: [],
  calendar: [],
  clock: [],
  paidMonths: [],
  analytics: null,
  defaultEmployerId: null,
  loaded: false,
  loading: false,
  employersLoaded: false,
};

// Fetch every module in parallel. `force` re-fetches even if already loaded.
export const loadAllData = createAsyncThunk(
  'data/loadAll',
  async (_opts: { force?: boolean } | undefined) => {
    const win = calendarWindow();
    const [shiftRes, empRes, wageRes, cal, clockRes, paid, analytics] = await Promise.all([
      listShifts({ limit: 500 }),
      listEmployers({ limit: 200 }),
      listSalaries({ limit: 500 }),
      listCalendar(win),
      listClock({ limit: 200 }),
      listPaidMonths(),
      getShiftAnalytics().catch(() => null),
    ]);
    return {
      shifts: shiftRes.data,
      employers: empRes.data,
      wages: wageRes.data,
      calendar: cal,
      clock: clockRes.data,
      paidMonths: paid,
      analytics,
      defaultEmployerId: empRes.defaultEmployerId ?? null,
    };
  },
  {
    // Skip if a load is already running or done (unless forced).
    condition: (opts, { getState }) => {
      const s = (getState() as { data: DataState }).data;
      if (s.loading) return false;
      if (s.loaded && !opts?.force) return false;
      return true;
    },
  }
);

// Targeted refreshers — call after a create/update/delete so only the affected
// slice re-fetches instead of everything.
export const refreshShifts = createAsyncThunk('data/refreshShifts', async () =>
  (await listShifts({ limit: 500 })).data
);
export const refreshWages = createAsyncThunk('data/refreshWages', async () =>
  (await listSalaries({ limit: 500 })).data
);
export const refreshEmployers = createAsyncThunk('data/refreshEmployers', async () =>
  listEmployers({ limit: 200 })
);
export const refreshCalendar = createAsyncThunk('data/refreshCalendar', async () =>
  listCalendar(calendarWindow())
);
export const refreshClock = createAsyncThunk('data/refreshClock', async () =>
  (await listClock({ limit: 200 })).data
);
export const refreshPaidMonths = createAsyncThunk('data/refreshPaidMonths', async () =>
  listPaidMonths()
);
export const refreshAnalytics = createAsyncThunk('data/refreshAnalytics', async () =>
  getShiftAnalytics().catch(() => null)
);

// Make an employee the default and re-scope everything to them. The calendar,
// earnings and paid-months follow the default employee, so we refresh those
// (+ employers for the badge) after switching.
export const setDefaultEmployerThunk = createAsyncThunk(
  'data/setDefaultEmployer',
  async (employerId: string, { dispatch }) => {
    await apiSetDefaultEmployer(employerId);
    await Promise.all([
      dispatch(refreshEmployers()),
      dispatch(refreshCalendar()),
      dispatch(refreshAnalytics()),
      dispatch(refreshPaidMonths()),
    ]);
    return employerId;
  }
);

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    // Explicit wipe used by the root reducer on logout.
    clearData: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAllData.pending, (s) => {
        s.loading = true;
      })
      .addCase(loadAllData.fulfilled, (s, a) => {
        Object.assign(s, a.payload);
        s.loaded = true;
        s.loading = false;
        s.employersLoaded = true;
      })
      .addCase(loadAllData.rejected, (s) => {
        s.loading = false;
      })
      .addCase(refreshShifts.fulfilled, (s, a) => {
        s.shifts = a.payload;
      })
      .addCase(refreshWages.fulfilled, (s, a) => {
        s.wages = a.payload;
      })
      .addCase(refreshEmployers.fulfilled, (s, a) => {
        s.employers = a.payload.data;
        s.defaultEmployerId = a.payload.defaultEmployerId ?? null;
        s.employersLoaded = true;
      })
      .addCase(refreshCalendar.fulfilled, (s, a) => {
        s.calendar = a.payload;
      })
      .addCase(refreshClock.fulfilled, (s, a) => {
        s.clock = a.payload;
      })
      .addCase(refreshPaidMonths.fulfilled, (s, a) => {
        s.paidMonths = a.payload;
      })
      .addCase(refreshAnalytics.fulfilled, (s, a) => {
        s.analytics = a.payload;
      })
      .addCase(setDefaultEmployerThunk.fulfilled, (s, a) => {
        s.defaultEmployerId = a.payload;
      });
  },
});

export const { clearData } = dataSlice.actions;
export default dataSlice.reducer;
