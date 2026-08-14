const events = [
  { approvedAt: '2023-01-01T00:00:00Z' },
  { approvedAt: undefined }
];
console.log(events.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime()));
