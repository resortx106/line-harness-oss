import ScenarioDetailClient from './scenario-detail-client'

export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default function ScenarioDetailPage() {
  return <ScenarioDetailClient />
}
