import { Layout } from './components/Layout';
import { QuickAddHost } from './components/QuickAdd';
import { useAppState } from './state/store';
import { useUi } from './state/ui';
import { Budgets } from './pages/Budgets';
import { CalendarPage } from './pages/CalendarPage';
import { Dashboard } from './pages/Dashboard';
import { Debts } from './pages/Debts';
import { GroupPage } from './pages/GroupPage';
import { Income } from './pages/Income';
import { Onboarding } from './pages/Onboarding';
import { Operations } from './pages/Operations';
import { Reports } from './pages/Reports';
import { Savings } from './pages/Savings';
import { Settings } from './pages/Settings';
import { Staff } from './pages/Staff';

export default function App() {
  const state = useAppState();
  const { page } = useUi();

  const content = (() => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'operations': return <Operations />;
      case 'income': return <Income />;
      case 'family': return <GroupPage group="family" />;
      case 'housing': return <GroupPage group="housing" />;
      case 'staff': return <Staff />;
      case 'transport': return <GroupPage group="transport" />;
      case 'debts': return <Debts />;
      case 'savings': return <Savings />;
      case 'budgets': return <Budgets />;
      case 'calendar': return <CalendarPage />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
    }
  })();

  return (
    <>
      <Layout>{content}</Layout>
      <QuickAddHost />
      {!state.settings.onboarded && <Onboarding />}
    </>
  );
}
