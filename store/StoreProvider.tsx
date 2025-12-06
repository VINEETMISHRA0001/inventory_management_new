'use client';

import { useRef, useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from './store';
import { restoreAuth } from './slices/authSlice';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>();
  const [isHydrated, setIsHydrated] = useState(false);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  useEffect(() => {
    setIsHydrated(true);
    storeRef.current?.dispatch(restoreAuth());
  }, []);

  if (!isHydrated) {
    return <Provider store={storeRef.current}>{children}</Provider>;
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}


