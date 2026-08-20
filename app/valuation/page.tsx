import { OSShell } from '@/components/os-shell'
import { ValuationWorkspace } from '@/components/valuation-workspace'

export default function ValuationPage() {
  return (
    <OSShell title="Valuation" eyebrow="MOTOR DETERMINÍSTICO">
      <ValuationWorkspace />
    </OSShell>
  )
}
