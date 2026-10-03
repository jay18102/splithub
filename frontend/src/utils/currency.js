export function formatRupee(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const PRESET_SERVICES = [
  {
    name: "Netflix Premium 4K",
    category: "Entertainment",
    defaultPrice: 649,
    logo: "netflix",
    color: "#E50914",
    bg: "bg-red-500/10 text-red-600 border-red-200",
    maxScreens: 4,
  },
  {
    name: "Spotify Family",
    category: "Music",
    defaultPrice: 179,
    logo: "spotify",
    color: "#1DB954",
    bg: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    maxScreens: 6,
  },
  {
    name: "YouTube Premium Family",
    category: "Entertainment",
    defaultPrice: 189,
    logo: "youtube",
    color: "#FF0000",
    bg: "bg-rose-500/10 text-rose-600 border-rose-200",
    maxScreens: 5,
  },
  {
    name: "Google One 2TB",
    category: "Cloud & Storage",
    defaultPrice: 650,
    logo: "google",
    color: "#4285F4",
    bg: "bg-blue-500/10 text-blue-600 border-blue-200",
    maxScreens: 5,
  },
  {
    name: "Disney+ Hotstar Super",
    category: "Entertainment",
    defaultPrice: 899,
    logo: "hotstar",
    color: "#0C2053",
    bg: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    maxScreens: 2,
  },
  {
    name: "ChatGPT Team",
    category: "Productivity",
    defaultPrice: 2000,
    logo: "chatgpt",
    color: "#10A37F",
    bg: "bg-teal-500/10 text-teal-600 border-teal-200",
    maxScreens: 5,
  },
  {
    name: "Amazon Prime Video",
    category: "Entertainment",
    defaultPrice: 299,
    logo: "prime",
    color: "#00A8E1",
    bg: "bg-sky-500/10 text-sky-600 border-sky-200",
    maxScreens: 3,
  },
  {
    name: "Apple One Family",
    category: "Productivity",
    defaultPrice: 365,
    logo: "apple",
    color: "#A2AAAD",
    bg: "bg-zinc-500/10 text-zinc-600 border-zinc-200",
    maxScreens: 5,
  }
];

export function getServiceBadgeStyle(serviceName = "") {
  const lower = serviceName.toLowerCase();
  if (lower.includes("netflix")) return "bg-red-50 text-red-700 border-red-200";
  if (lower.includes("spotify")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (lower.includes("youtube")) return "bg-rose-50 text-rose-700 border-rose-200";
  if (lower.includes("google")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (lower.includes("chatgpt")) return "bg-teal-50 text-teal-700 border-teal-200";
  if (lower.includes("hotstar")) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (lower.includes("prime") || lower.includes("amazon")) return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}
