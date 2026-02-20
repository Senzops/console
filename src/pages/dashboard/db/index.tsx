import DashboardView from "../../../components/DashboardView";

export default function DatabaseDashboard() {
  return <DashboardView filterType="database" />; // Assuming your dashboard view gracefully falls back if filter type isn't fully implemented, otherwise it shows 'All'
}
