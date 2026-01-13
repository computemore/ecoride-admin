import { Navigate } from 'react-router-dom';

export default function DeactivatedDriversPage() {
  return <Navigate to="/drivers?view=deactivated" replace />;
}
