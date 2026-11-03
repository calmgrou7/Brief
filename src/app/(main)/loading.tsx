export default function Loading() {
  return (
    <div className="stack" aria-busy="true" aria-label="불러오는 중">
      <div className="skeleton" style={{ height: 56, width: '50%' }} />
      <div className="skeleton" style={{ height: 88 }} />
      <div className="skeleton" style={{ height: 260 }} />
    </div>
  );
}
