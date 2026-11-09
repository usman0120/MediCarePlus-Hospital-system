import { Card, ErrorNotice, Skeleton } from '../pages/Dashboard.jsx';

export default function BedGrid({ beds, loading, error }) {
  const usable = beds.filter(bed => bed.status !== 'maintenance');
  const occupied = usable.filter(bed => bed.status === 'occupied').length;
  const occupancy = usable.length ? occupied / usable.length * 100 : null;
  return <Card title="Bed occupancy">
    {loading ? <Skeleton /> : error ? <ErrorNotice message={error} /> : <>
      <p className="mb-4">{occupancy == null ? 'No beds configured.' : `${occupied} of ${usable.length} usable beds occupied (${occupancy.toFixed(1)}%).`}</p>
      {occupancy > 80 && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-red-900">Bed occupancy exceeds 80%. Review admissions and bed capacity.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{beds.map(bed => <div key={bed.id}
        className={`rounded-lg border p-3 ${bed.status === 'occupied' ? 'border-red-300 bg-red-50 text-red-950' : bed.status === 'available' ? 'border-teal-300 bg-teal-50 text-teal-950' : 'border-slate-300'}`}>
        <strong>{bed.label}</strong><p>{bed.type}</p><p>{bed.status}</p>{bed.patientId && <p className="break-all text-xs">Patient: {bed.patientId}</p>}
      </div>)}</div>
    </>}
  </Card>;
}
