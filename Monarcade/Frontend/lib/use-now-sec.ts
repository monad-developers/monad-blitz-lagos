"use client";

import { useSyncExternalStore } from "react";

const subscribe = (onStoreChange: () => void) => {
  const timerId = window.setInterval(onStoreChange, 30_000);
  return () => window.clearInterval(timerId);
};

const getSnapshot = () => Math.floor(Date.now() / 1000);
const getServerSnapshot = () => 0;

export const useNowSec = () => {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};
