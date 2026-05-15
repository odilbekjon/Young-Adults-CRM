import { useState, useRef, useEffect } from "react";
import { BsCashStack } from "react-icons/bs";
import { FiFilter, FiCalendar, FiChevronDown, FiMail } from "react-icons/fi";
import { IoTimeOutline } from "react-icons/io5";
import { IoMdFlag } from "react-icons/io";

// ---------- Types ----------
interface Debtor {
  id: number;
  name: string;
  phone: string;
  balance: number;
  totalOnPeriod: number;
  groupTag: string;
  groupDetail: string;
  comment: string;
  task: string;
  status: string;
}

// ---------- Mock data ----------
const MOCK_DEBTORS: Debtor[] = Array.from({ length: 47 }, (_, i) => {
  const names = [
    "Bo'riyeva Nozima (copy 3263)",
    "Bekmurodov Hayitmurod",
    "Qilichova Zarifa",
    "Axrorova Madina",
    "Bo'riyev Mirjalol",
    "Toshmatov Jasur",
    "Rahimova Dilnoza",
    "Yusupov Sardor",
    "Karimova Nilufar",
    "Ergashev Bobur",
  ];
  const phones = [
    "94 014 72 40", "94 590 76 07", "88 708 79 82", "70 039 29 90",
    "94 870 21 10", "93 123 45 67", "91 234 56 78", "90 345 67 89",
    "95 456 78 90", "97 567 89 01",
  ];
  const groups = [
    { tag: "Young Developers", detail: "Frontend (Odilbek Safarov - 12:00) • 23.04.2026" },
    { tag: "new group", detail: "Kampyuter Savodxonligi (Odilbek Safarov - 16:00) • 11.05.2026" },
    { tag: "Math Masters", detail: "Matematika (G'ulomjon Egamberdiyev - 16:00) • 04.03.2026" },
    { tag: "new group", detail: "Python Basics (Sherzod Tursunov - 14:00) • 15.04.2026" },
  ];
  const amounts = [-369231, -207692, -207692, -207692, -269231, -312000, -180000, -250000, -195000, -320000];
  const idx = i % names.length;
  const grp = groups[i % groups.length];
  return {
    id: i + 1,
    name: names[idx],
    phone: phones[idx],
    balance: amounts[idx],
    totalOnPeriod: amounts[idx],
    groupTag: grp.tag,
    groupDetail: grp.detail,
    comment: "",
    task: "",
    status: "active",
  };
});

const STATUSES = ["Active (Not archived)", "Archived", "All"];
const PAGE_SIZE_OPTIONS = [20, 25, 50];

// ---------- Helpers ----------
const formatUZS = (n: number) =>
  n.toLocaleString("uz-UZ") + " UZS";

// ---------- Small components ----------
const SelectBox = ({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-left hover:border-gray-400 transition-colors min-w-[140px]">
        <span className={value ? "text-gray-800" : "text-gray-400"}>{value || placeholder || "Select"}</span>
        <FiChevronDown size={13} className="text-gray-400 ml-2 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-full py-1">
          {options.map(opt => (
            <button key={opt} type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
              onClick={() => { onChange(opt); setOpen(false); }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SearchByDropdown = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const opts = ["Name", "Phone", "Group"];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 border border-gray-300 rounded-l px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors border-r-0">
        Search by {value} <FiChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
          {opts.map(opt => (
            <button key={opt} type="button"
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => { onChange(opt); setOpen(false); }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- Main Component ----------
export const Debtors = () => {
  const [searchBy, setSearchBy] = useState("Name");
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("Active (Not archived)");
  const [group, setGroup] = useState("");
  const [debtFrom, setDebtFrom] = useState("");
  const [debtTo, setDebtTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [task, setTask] = useState("");
  const [activeFilters, setActiveFilters] = useState({ searchBy: "Name", searchText: "", status: "Active (Not archived)", group: "", debtFrom: "", debtTo: "" });
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filtered
  const filtered = MOCK_DEBTORS.filter(d => {
    if (activeFilters.searchText) {
      const val = activeFilters.searchText.toLowerCase();
      if (activeFilters.searchBy === "Name" && !d.name.toLowerCase().includes(val)) return false;
      if (activeFilters.searchBy === "Phone" && !d.phone.includes(val)) return false;
      if (activeFilters.searchBy === "Group" && !d.groupDetail.toLowerCase().includes(val)) return false;
    }
    if (activeFilters.group && d.groupTag !== activeFilters.group) return false;
    if (activeFilters.debtFrom && d.balance > Number(activeFilters.debtFrom)) return false;
    if (activeFilters.debtTo && d.balance < Number(activeFilters.debtTo)) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const totalBalance = filtered.reduce((a, d) => a + d.balance, 0);
  const totalPeriod = filtered.reduce((a, d) => a + d.totalOnPeriod, 0);

  const allChecked = paginated.length > 0 && paginated.every(d => selected.includes(d.id));
  const toggleAll = () => {
    if (allChecked) setSelected(s => s.filter(id => !paginated.find(d => d.id === id)));
    else setSelected(s => [...new Set([...s, ...paginated.map(d => d.id)])]);
  };
  const toggleOne = (id: number) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleFilter = () => {
    setActiveFilters({ searchBy, searchText, status, group, debtFrom, debtTo });
    setPage(1);
  };

  const inputCls = "border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400 w-full";

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      {/* Title */}
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-semibold text-gray-800">Debtors</h1>
        <span className="text-sm text-gray-500">Quantity — {filtered.length}</span>
      </div>

      {/* Summary cards */}
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 flex items-center justify-between mb-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-1 h-7 bg-blue-500 rounded-full mr-1" />
          <span className="text-gray-700 font-medium">Total: {formatUZS(totalBalance)}</span>
        </div>
        <BsCashStack className="text-blue-400 text-2xl" />
      </div>
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 flex items-center justify-between mb-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-1 h-7 bg-blue-500 rounded-full mr-1" />
          <span className="text-gray-700 font-medium">Total on period: {formatUZS(totalPeriod)}</span>
        </div>
        <BsCashStack className="text-blue-400 text-2xl" />
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 mb-4 shadow-sm">
        {/* Row 1 */}
        <div className="grid grid-cols-5 gap-3 mb-3">
          <div className="col-span-1">
            <label className="text-xs text-gray-500 mb-1 block">Search</label>
            <div className="flex">
              <SearchByDropdown value={searchBy} onChange={setSearchBy} />
              <input type="text" className="flex-1 border border-gray-300 rounded-r px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <SelectBox value={status} onChange={setStatus} options={STATUSES} placeholder="Active (Not archived)" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Group</label>
            <SelectBox value={group} onChange={setGroup} options={["Young Developers", "new group", "Math Masters"]} placeholder="Select" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Debt amount (from)</label>
            <SelectBox value={debtFrom} onChange={setDebtFrom} options={["-100000", "-200000", "-300000", "-400000"]} placeholder="Select" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Debt amount (to)</label>
            <SelectBox value={debtTo} onChange={setDebtTo} options={["-100000", "-200000", "-300000", "-400000"]} placeholder="Select" />
          </div>
        </div>
        {/* Row 2 */}
        <div className="flex items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date from</label>
            <div className="relative">
              <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input type="text" className={inputCls + " pl-7 w-44"} placeholder="No date selected"
                value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date to</label>
            <div className="relative">
              <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input type="text" className={inputCls + " pl-7 w-44"} placeholder="No date selected"
                value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Task</label>
            <SelectBox value={task} onChange={setTask} options={["Task 1", "Task 2", "Task 3"]} placeholder="Select" />
          </div>
          <button onClick={handleFilter}
            className="bg-blue-700 hover:bg-blue-800 text-white rounded-full px-6 py-1.5 text-sm font-medium transition-colors">
            Filter
          </button>
        </div>
      </div>

      {/* Table toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Rows per page:</span>
          <select className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none"
            value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
            {PAGE_SIZE_OPTIONS.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <button className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-600 bg-white hover:bg-gray-50 transition-colors">
          <FiFilter size={13} /> Filters
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 w-8">
                <input type="checkbox" checked={allChecked} onChange={toggleAll}
                  className="rounded accent-blue-600" />
              </th>
              <th className="px-3 py-3 text-left text-gray-500 font-medium w-8">#</th>
              <th className="px-3 py-3 text-left text-gray-500 font-medium">Name</th>
              <th className="px-3 py-3 text-left text-gray-500 font-medium">Phone</th>
              <th className="px-3 py-3 text-left text-gray-500 font-medium">Balance</th>
              <th className="px-3 py-3 text-left text-gray-500 font-medium">Total on period</th>
              <th className="px-3 py-3 text-left text-gray-500 font-medium">Group</th>
              <th className="px-3 py-3 text-left text-gray-500 font-medium">Comment</th>
              <th className="px-3 py-3 text-left text-gray-500 font-medium">Task</th>
              <th className="px-3 py-3 text-left text-gray-500 font-medium">Status</th>
              <th className="px-3 py-3 w-8">
                <FiMail size={15} className="text-yellow-500" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-10 text-gray-400">No Data</td></tr>
            ) : (
              paginated.map((d, i) => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleOne(d.id)}
                      className="rounded accent-blue-600" />
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{(page - 1) * pageSize + i + 1}.</td>
                  <td className="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">{d.name}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{d.phone}</td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{formatUZS(d.balance)}</td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{formatUZS(d.totalOnPeriod)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap
                        ${d.groupTag === "Young Developers" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
                        {d.groupTag}
                      </span>
                      <span className="text-gray-600 text-xs whitespace-nowrap">{d.groupDetail}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs">
                      {d.name.charAt(0)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <IoTimeOutline size={18} className="text-orange-400" />
                  </td>
                  <td className="px-3 py-3">
                    <IoMdFlag size={18} className="text-green-500" />
                  </td>
                  <td className="px-3 py-3" />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 rounded text-sm border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              «
            </button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 rounded text-sm border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded text-sm border transition-colors ${
                    page === p
                      ? "bg-blue-700 border-blue-700 text-white"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 rounded text-sm border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ›
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 rounded text-sm border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};