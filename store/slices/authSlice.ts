import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI, setAuthToken } from '../../lib/api';
import { Storage } from '../../lib/storage';
import { clearAttestation } from '../../lib/attestation';
import { clearRuntimeConfig } from '../../lib/runtimeConfig';

export interface User {
    id: string;
    email: string;
    displayName?: string;
    emailVerified: boolean;
    profilePicture?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null, token: null, refreshToken: null,
    isLoading: false, isAuthenticated: false, error: null,
};

export const loginThunk = createAsyncThunk(
    'auth/login',
    async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
        try {
            const res = await authAPI.login(email, password);
            const { accessToken, refreshToken, user } = res.data.data;
            await Storage.saveToken(accessToken);
            await Storage.saveRefreshToken(refreshToken);
            await Storage.saveUser(user);
            setAuthToken(accessToken);
            return { token: accessToken, refreshToken, user };
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Login failed');
        }
    }
);

export const registerThunk = createAsyncThunk(
    'auth/register',
    async ({ email, password, displayName }: { email: string; password: string; displayName?: string }, { rejectWithValue }) => {
        try {
            const res = await authAPI.register(email, password, displayName);
            return res.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Registration failed');
        }
    }
);

export const googleLoginThunk = createAsyncThunk(
    'auth/google',
    async (idToken: string, { rejectWithValue }) => {
        try {
            const res = await authAPI.google(idToken);
            const { accessToken, refreshToken, user } = res.data.data;
            await Storage.saveToken(accessToken);
            await Storage.saveRefreshToken(refreshToken);
            await Storage.saveUser(user);
            setAuthToken(accessToken);
            return { token: accessToken, refreshToken, user };
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message ?? 'Google sign-in failed');
        }
    }
);

export const logoutThunk = createAsyncThunk('auth/logout', async (logoutAll?: boolean) => {
    try { await authAPI.logout(logoutAll); } catch {}
    await Storage.clear();
    setAuthToken(null);
    clearAttestation();
    clearRuntimeConfig();
});

export const loadStoredAuth = createAsyncThunk('auth/loadStored', async () => {
    const token        = await Storage.getToken();
    const refreshToken = await Storage.getRefreshToken();
    const user         = await Storage.getUser();
    // Prime the in-memory token so requests are authorised immediately on restore.
    if (token) setAuthToken(token);
    return { token, refreshToken, user };
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => { state.error = null; },
        setUser:    (state, action: PayloadAction<User>) => { state.user = action.payload; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loginThunk.pending,   (s) => { s.isLoading = true; s.error = null; })
            .addCase(loginThunk.fulfilled, (s, a) => {
                s.isLoading = false;
                s.token = a.payload.token;
                s.refreshToken = a.payload.refreshToken;
                s.user = a.payload.user;
                s.isAuthenticated = true;
            })
            .addCase(loginThunk.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload as string; });

        builder
            .addCase(registerThunk.pending,   (s) => { s.isLoading = true; s.error = null; })
            .addCase(registerThunk.fulfilled, (s) => { s.isLoading = false; })
            .addCase(registerThunk.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload as string; });

        builder
            .addCase(googleLoginThunk.pending,   (s) => { s.isLoading = true; s.error = null; })
            .addCase(googleLoginThunk.fulfilled, (s, a) => {
                s.isLoading = false;
                s.token = a.payload.token;
                s.refreshToken = a.payload.refreshToken;
                s.user = a.payload.user;
                s.isAuthenticated = true;
            })
            .addCase(googleLoginThunk.rejected,  (s, a) => { s.isLoading = false; s.error = a.payload as string; });

        builder.addCase(logoutThunk.fulfilled, (s) => {
            s.user = null; s.token = null; s.refreshToken = null; s.isAuthenticated = false;
        });

        builder.addCase(loadStoredAuth.fulfilled, (s, a) => {
            if (a.payload.token && a.payload.user) {
                s.token = a.payload.token;
                s.refreshToken = a.payload.refreshToken;
                s.user = a.payload.user;
                s.isAuthenticated = true;
            }
        });
    },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
