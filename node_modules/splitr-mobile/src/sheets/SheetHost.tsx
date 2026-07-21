import React from 'react';
import {AddExpenseSheet} from './AddExpenseSheet';
import {CreateGroupSheet} from './CreateGroupSheet';
import {SettleSheet} from './SettleSheet';
import {SuccessOverlay} from './SuccessOverlay';
import {Toast} from '../components/Toast';

/**
 * Mounts every global overlay once, at the navigation root. Each reads the
 * shared store's `sheet` field and shows itself when active, so any screen can
 * trigger a sheet without prop-drilling.
 */
export const SheetHost: React.FC = () => (
  <>
    <AddExpenseSheet />
    <CreateGroupSheet />
    <SettleSheet />
    <SuccessOverlay />
    <Toast />
  </>
);
