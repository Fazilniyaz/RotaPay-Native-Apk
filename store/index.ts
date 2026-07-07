import { configureStore, combineReducers, Action } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import settingsReducer from './slices/settingsSlice';
import notificationsReducer from './slices/notificationsSlice';
import dataReducer from './slices/dataSlice';

const appReducer = combineReducers({
    auth: authReducer,
    settings: settingsReducer,
    notifications: notificationsReducer,
    data: dataReducer,
});

type AppState = ReturnType<typeof appReducer>;

// On logout, reset every slice to its initial state so no cached data (shifts,
// wages, notifications, settings, …) survives into the next session. We keep the
// `auth` slice's own logout handling but blow away everything else by passing
// `undefined` state to the combined reducer.
const rootReducer = (state: AppState | undefined, action: Action): AppState => {
    if (action.type === 'auth/logout/fulfilled') {
        return appReducer(undefined, action);
    }
    return appReducer(state, action);
};

export const store = configureStore({
    reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
