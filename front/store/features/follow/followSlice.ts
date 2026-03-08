import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toggleFollowApi } from "./followApi";

export interface FollowState {
  followLoading: boolean;
  followError: string | null;
  /** patissiereId -> { following, count } after a successful toggle (for optimistic UI / profile screens). */
  statusByPatissiere: Record<string, { following: boolean; count: number }>;
}

const initialState: FollowState = {
  followLoading: false,
  followError: null,
  statusByPatissiere: {},
};

export const toggleFollow = createAsyncThunk(
  "follow/toggleFollow",
  async (
    patissiereId: string,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { auth: { user: { id: string } | null } };
      const userId = state.auth.user?.id ?? null;
      if (!userId) {
        return rejectWithValue("You must be logged in to follow");
      }
      const { following, count } = await toggleFollowApi(patissiereId, userId);
      return { patissiereId, userId, following, count };
    } catch (err: any) {
      return rejectWithValue(
        err?.response?.data?.message ?? "Failed to toggle follow"
      );
    }
  }
);

const followSlice = createSlice({
  name: "follow",
  initialState,
  reducers: {
    setFollowStatus(
      state,
      action: {
        payload: {
          patissiereId: string;
          following: boolean;
          count: number;
        };
      }
    ) {
      const { patissiereId, following, count } = action.payload;
      state.statusByPatissiere[patissiereId] = { following, count };
    },
    clearFollowError(state) {
      state.followError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(toggleFollow.pending, (state) => {
        state.followLoading = true;
        state.followError = null;
      })
      .addCase(toggleFollow.fulfilled, (state, action) => {
        state.followLoading = false;
        const { patissiereId, following, count } = action.payload;
        state.statusByPatissiere[patissiereId] = { following, count };
      })
      .addCase(toggleFollow.rejected, (state, action) => {
        state.followLoading = false;
        state.followError = (action.payload as string) ?? "Unknown error";
      });
  },
});

export const { setFollowStatus, clearFollowError } = followSlice.actions;
export default followSlice.reducer;
