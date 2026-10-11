'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, type Socket } from 'socket.io-client';
import type { PublicRoom, Reply, RoomView } from './types';

type Settings = {
  name: string;
  avatar: number;
  sound: boolean;
  music: boolean;
  theme: 'forest' | 'midnight';
  cardBack: 'classic' | 'gold' | 'ocean';
  language: 'en' | 'ta';
  set: (settings: Partial<Omit<Settings, 'set'>>) => void;
};
export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      name: '',
      avatar: 0,
      sound: true,
      music: false,
      theme: 'forest',
      cardBack: 'classic',
      language: 'en',
      set,
    }),
    { name: 'getaway-preferences', skipHydration: true },
  ),
);
type State = {
  connected: boolean;
  room: RoomView | null;
  rooms: PublicRoom[];
  toast: string;
  setToast: (toast: string) => void;
};
export const useGame = create<State>((set) => ({
  connected: false,
  room: null,
  rooms: [],
  toast: '',
  setToast: (toast) => set({ toast }),
}));
let socket: Socket | undefined;
export function connect() {
  if (socket) {
    socket.connect();
    return socket;
  }
  socket = io({
    auth: { token: sessionStorage.getItem('getaway-session') },
    reconnectionDelay: 800,
    reconnectionDelayMax: 3000,
  });
  socket.on('session', ({ token, id }: { token: string; id: string }) => {
    const current = useGame.getState().room;
    if (current && current.youId !== id)
      useGame.setState({
        room: null,
        toast: 'The server restarted. Open a new table to play again.',
      });
    sessionStorage.setItem('getaway-session', token);
    if (socket) socket.auth = { token };
  });
  socket.on('connect', () => useGame.setState({ connected: true }));
  socket.on('disconnect', () => useGame.setState({ connected: false }));
  socket.on('connect_error', () => useGame.setState({ connected: false }));
  socket.on('room:state', (room: RoomView) => useGame.setState({ room }));
  socket.on('rooms:list', (rooms: PublicRoom[]) => useGame.setState({ rooms }));
  socket.on('room:left', () => useGame.setState({ room: null }));
  socket.on('room:closed', (toast: string) => useGame.setState({ room: null, toast }));
  return socket;
}
export async function request<T = undefined>(event: string, data: unknown): Promise<T | undefined> {
  if (!socket?.connected)
    throw new Error('Reconnecting to the club. Please try again in a moment.');
  const response = (await socket.timeout(8000).emitWithAck(event, data)) as Reply<T>;
  if (!response.ok) throw new Error(response.error);
  return response.data;
}
export async function act(event: string, data: unknown) {
  try {
    await request(event, data);
  } catch (e) {
    useGame.getState().setToast(e instanceof Error ? e.message : 'Please try again.');
  }
}
