import { useState, useMemo } from "react";

type TabType = "attendance" | "schedule" | "salary";

interface DayInfo {
  date: number;
  month: string;
  dayName: string;
  isWeekend: boolean;
  isToday: boolean;
}

interface Teacher {
  id: number;
  name: string;
  attendance: Record<number, string | null>;
}

function getDaysInMonth(year: number, month: number): DayInfo[] {
  const days: DayInfo[] = [];
  const today = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const monthShort = "may";

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dayIndex = date.getDay();
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    days.push({
      date: d,
      month: monthShort,
      dayName: dayNames[dayIndex],
      isWeekend,
      isToday,
    });
  }
  return days;
}

const TABS: { key: TabType; label: string }[] = [
  { key: "attendance", label: "Teacher attendance reports" },
  { key: "schedule", label: "Teacher work schedule" },
  { key: "salary", label: "Salary calculation" },
];

const SAMPLE_TEACHERS: Teacher[] = [];

export const TeacherAttendanceReport = () => {
  const [activeTab, setActiveTab] = useState<TabType>("attendance");
  const [selectedMonth, setSelectedMonth] = useState("2026-05");
  const [teachers] = useState<Teacher[]>(SAMPLE_TEACHERS);

  const [year, month] = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    return [y, m];
  }, [selectedMonth]);

  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const workingDays = days.filter((d) => !d.isWeekend).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Teacher attendance reports</h1>
        <p className="mt-2 text-[15px] text-slate-600">
          Review attendance and daily activity with clearer, larger controls and tables.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-3.5 text-[15px] font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "text-blue-600 border-blue-600"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 md:p-6">
          {activeTab === "attendance" && (
            <>
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-700 shadow-sm">
                <svg
                  className="h-5 w-5 shrink-0 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5" />
                  <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1.5" />
                </svg>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] text-slate-700 outline-none cursor-pointer"
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[960px] border-collapse text-sm" style={{ minWidth: 960 }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 min-w-[160px] border-r border-b border-slate-200 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-700">
                        Teachers
                      </th>

                      {days.map((day) => (
                        <th
                          key={day.date}
                          className={`border-r border-b border-slate-200 px-3 py-3 text-center font-semibold whitespace-nowrap ${
                            day.isToday
                              ? "bg-amber-50 text-amber-700"
                              : day.isWeekend
                              ? "bg-slate-50 text-slate-400"
                              : "bg-slate-50 text-slate-600"
                          }`}
                        >
                          <span className="block text-[13px] font-semibold">{day.date}-{day.month}</span>
                          <span
                            className={`mt-1 block text-[12px] font-normal ${
                              day.isToday ? "text-amber-600" : "text-slate-400"
                            }`}
                          >
                            {day.dayName}
                          </span>
                        </th>
                      ))}

                      <th className="min-w-[96px] border-r border-b border-slate-200 bg-slate-50 px-3 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
                        Full work day
                      </th>
                      <th className="min-w-[72px] border-r border-b border-slate-200 bg-slate-50 px-3 py-3 text-center font-semibold text-slate-700">
                        Came
                      </th>
                      <th className="min-w-[72px] border-b border-slate-200 bg-slate-50 px-3 py-3 text-center font-semibold text-slate-700">
                        Extra
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.length === 0 ? (
                      <tr>
                        <td colSpan={days.length + 4} className="py-14 text-center text-slate-500 text-[15px]">
                          No Data
                        </td>
                      </tr>
                    ) : (
                      teachers.map((teacher) => {
                        const came = days.filter((d) => teacher.attendance[d.date] === "present").length;
                        const extra = Math.max(0, came - workingDays);

                        return (
                          <tr key={teacher.id} className="hover:bg-slate-50">
                            <td className="sticky left-0 z-10 border-r border-t border-slate-200 bg-white px-3 py-3 font-semibold text-slate-800">
                              {teacher.name}
                            </td>
                            {days.map((day) => {
                              const status = teacher.attendance[day.date];
                              return (
                                <td
                                  key={day.date}
                                  className={`border-r border-t border-slate-200 px-3 py-3 text-center ${
                                    day.isWeekend ? "bg-slate-50" : ""
                                  } ${day.isToday ? "bg-amber-50/40" : ""}`}
                                >
                                  {status === "present" && (
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-[11px] font-semibold text-green-700">
                                      ✓
                                    </span>
                                  )}
                                  {status === "absent" && (
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-[11px] font-semibold text-red-600">
                                      ✗
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border-r border-t border-slate-200 px-3 py-3 text-center text-slate-700">
                              {workingDays}
                            </td>
                            <td className="border-r border-t border-slate-200 px-3 py-3 text-center text-slate-700">
                              {came}
                            </td>
                            <td className="border-t border-slate-200 px-3 py-3 text-center text-slate-700">
                              {extra}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "schedule" && (
            <div className="py-16 text-center text-slate-500 text-[15px]">
              Teacher work schedule coming soon
            </div>
          )}

          {activeTab === "salary" && (
            <div className="py-16 text-center text-slate-500 text-[15px]">
              Salary calculation coming soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
};