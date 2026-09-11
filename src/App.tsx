import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { EmptyState, ErrorState, LoadingState } from './components/states/States';
import { useStore } from './store/useStore';
import { TourCard } from './tour/TourCard';
import { CalendarScreen } from './screens/Calendar';
import { AuditScreen } from './screens/Audit';
import { ContactFormScreen } from './screens/ContactForm';
import { ContactDetailScreen, ContactsScreen } from './screens/Contacts';
import { DemoPanelScreen } from './screens/DemoPanel';
import { DocumentDetailScreen, DocumentsScreen, NewDocumentScreen } from './screens/Documents';
import {
  FileAuditScreen,
  FileDetailScreen,
  FilesScreen,
  NewPotentialScreen,
} from './screens/Files';
import { FinanceScreen } from './screens/Finance';
import { FinancePrintPreviewScreen } from './screens/FinancePrint';
import { HearingFormScreen } from './screens/HearingForm';
import { HearingDetailScreen, HearingsScreen } from './screens/Hearings';
import { InboxReviewScreen, InboxScreen } from './screens/Inbox';
import { SettingsScreen } from './screens/Settings';
import { NotFoundScreen } from './screens/System';
import { NewManualTaskScreen, TaskApprovalScreen, TasksScreen } from './screens/Tasks';
import { TodayScreen } from './screens/Today';
import { UsersScreen } from './screens/Users';

function RouteContent() {
  const screenState = useStore((state) => state.settings.screenState);
  const setScreenState = useStore((state) => state.setScreenState);
  const location = useLocation();
  if (location.pathname !== '/demo' && screenState === 'loading') return <LoadingState />;
  if (location.pathname !== '/demo' && screenState === 'empty') {
    return (
      <EmptyState
        title="Bu görünümde kayıt yok"
        description="Boş durum da kullanıcıyı yeni evrak, görev veya filtreye yönlendirir."
        action={
          <button className="button" type="button" onClick={() => setScreenState('default')}>
            Varsayılan veriyi göster
          </button>
        }
      />
    );
  }
  if (location.pathname !== '/demo' && screenState === 'error') {
    return <ErrorState onRetry={() => setScreenState('default')} />;
  }
  return (
    <Routes>
      <Route path="/" element={<Navigate replace to="/bugun" />} />
      <Route path="/bugun" element={<TodayScreen />} />
      <Route path="/gelen" element={<InboxScreen />} />
      <Route path="/gelen/:evrakId" element={<InboxReviewScreen />} />
      <Route path="/dosyalar" element={<FilesScreen />} />
      <Route path="/dosyalar/yeni-potansiyel" element={<NewPotentialScreen />} />
      <Route path="/dosyalar/:dosyaId" element={<FileDetailScreen />} />
      <Route path="/dosyalar/:dosyaId/audit" element={<FileAuditScreen />} />
      <Route path="/gorevler" element={<TasksScreen />} />
      <Route path="/gorevler/yeni" element={<NewManualTaskScreen />} />
      <Route path="/gorevler/:adayId" element={<TaskApprovalScreen />} />
      <Route path="/takvim" element={<CalendarScreen />} />
      <Route path="/takvim/yeni" element={<HearingFormScreen calendarEntry />} />
      <Route path="/belgeler" element={<DocumentsScreen />} />
      <Route path="/belgeler/yeni" element={<NewDocumentScreen />} />
      <Route path="/belgeler/:belgeId" element={<DocumentDetailScreen />} />
      <Route path="/durusmalar" element={<HearingsScreen />} />
      <Route path="/durusmalar/yeni" element={<HearingFormScreen />} />
      <Route path="/durusmalar/:durusmaId/duzenle" element={<HearingFormScreen />} />
      <Route path="/durusmalar/:durusmaId" element={<HearingDetailScreen />} />
      <Route path="/kisiler" element={<ContactsScreen />} />
      <Route path="/kisiler/yeni" element={<ContactFormScreen />} />
      <Route path="/kisiler/:kisiId/duzenle" element={<ContactFormScreen />} />
      <Route path="/kisiler/:kisiId" element={<ContactDetailScreen />} />
      <Route path="/finans" element={<FinanceScreen />} />
      <Route path="/finans/rapor/onizleme" element={<FinancePrintPreviewScreen />} />
      <Route path="/denetim" element={<AuditScreen />} />
      <Route path="/ayarlar" element={<SettingsScreen />} />
      <Route path="/kullanicilar" element={<UsersScreen />} />
      <Route path="/demo" element={<DemoPanelScreen />} />
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppShell>
      <RouteContent />
      <TourCard />
    </AppShell>
  );
}
