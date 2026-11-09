export const CATEGORIES = [
  { value: 'computer', label: 'Computer or laptop' },
  { value: 'projector', label: 'Projector' },
  { value: 'printer', label: 'Printer' },
  { value: 'network', label: 'Internet or network' },
  { value: 'electrical', label: 'Electrical or lighting' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'other', label: 'Other issue' },
];

export const STATUS = {
  created: { label: 'Waiting', detail: 'Waiting for a technician', variant: 'waiting' },
  taken: { label: 'In progress', detail: 'A technician is working on it', variant: 'progress' },
  finished: { label: 'Completed', detail: 'The issue has been resolved', variant: 'finished' },
};

export const getCategoryName = (value) => CATEGORIES.find((item) => item.value === value)?.label || value || 'Other issue';
export const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date);
};

export const initials = (user) => {
  const letters = [user?.first_name, user?.last_name].map((part) => part?.trim()?.[0]).filter(Boolean);
  return letters.join('').toUpperCase() || '?';
};

export const unpackPage = (data) => {
  if (Array.isArray(data)) return { results: data, count: data.length, next: null, previous: null };
  return { results: data?.results || [], count: data?.count || 0, next: data?.next || null, previous: data?.previous || null };
};

/** Filter a single already-loaded API page without making new requests. */
export const filterRequestsOnPage = (requests, query = '', category = 'all') => {
  const needle = query.toLowerCase().trim();
  return requests.filter((item) => {
    if (category !== 'all' && item.category !== category) return false;
    if (!needle) return true;
    const haystack = [item.id, item.room_number, item.requester_name, item.description, getCategoryName(item.category)]
      .filter((value) => value !== null && value !== undefined)
      .join(' ').toLowerCase();
    return haystack.includes(needle.replace(/^#/, ''));
  });
};
