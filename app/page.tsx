import { OverviewDashboard } from '@/components/overview-dashboard'
import { OSShell } from '@/components/os-shell'

export default function Home() {
  return (
    <OSShell title="Visão geral" eyebrow="MVP LOCAL-FIRST">
      <OverviewDashboard />
    </OSShell>
  )
}
