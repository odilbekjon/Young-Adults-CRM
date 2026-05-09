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

// Sample data — replace with real API data
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
    <div className="p-5 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-medium text-gray-900 mb-5">
        Teacher attendance reports
      </h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "text-blue-500 border-blue-500"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === "attendance" && (
            <>
              {/* Month picker */}
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-full mb-4 text-sm text-gray-700 bg-white">
                <svg
                  className="w-4 h-4 text-gray-400 shrink-0"
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
                  className="flex-1 outline-none bg-transparent text-sm text-gray-700 cursor-pointer"
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="border-collapse text-xs" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th
                        className="sticky left-0 z-10 bg-gray-50 border-r border-b border-gray-200 px-3 py-2 text-left font-medium text-gray-600 min-w-[140px]"
                      >
                        Teachers
                      </th>

                      {days.map((day) => (
                        <th
                          key={day.date}
                          className={`border-r border-b border-gray-200 px-2 py-2 text-center font-medium whitespace-nowrap ${
                            day.isToday
                              ? "bg-amber-50 text-amber-600"
                              : day.isWeekend
                              ? "bg-gray-50 text-gray-400"
                              : "bg-gray-50 text-gray-600"
                          }`}
                        >
                          <span className="block text-xs font-medium">
                            {day.date}-{day.month}
                          </span>
                          <span
                            className={`block text-[11px] font-normal ${
                              day.isToday
                                ? "text-amber-500"
                                : "text-gray-400"
                            }`}
                          >
                            {day.dayName}
                          </span>
                        </th>
                      ))}

                      <th className="border-r border-b border-gray-200 px-2 py-2 text-center font-medium text-gray-600 bg-gray-50 whitespace-nowrap min-w-[80px]">
                        Full work day
                      </th>
                      <th className="border-r border-b border-gray-200 px-2 py-2 text-center font-medium text-gray-600 bg-gray-50 min-w-[60px]">
                        Came
                      </th>
                      <th className="border-b border-gray-200 px-2 py-2 text-center font-medium text-gray-600 bg-gray-50 min-w-[60px]">
                        Extra
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={days.length + 4}
                          className="py-12 text-center text-gray-400 text-sm"
                        >
                          No Data
                        </td>
                      </tr>
                    ) : (
                      teachers.map((teacher) => {
                        const came = days.filter(
                          (d) => teacher.attendance[d.date] === "present"
                        ).length;
                        const extra = Math.max(0, came - workingDays);

                        return (
                          <tr key={teacher.id} className="hover:bg-gray-50">
                            <td className="sticky left-0 z-10 bg-white border-r border-t border-gray-200 px-3 py-2 text-gray-800 font-medium">
                              {teacher.name}
                            </td>
                            {days.map((day) => {
                              const status = teacher.attendance[day.date];
                              return (
                                <td
                                  key={day.date}
                                  className={`border-r border-t border-gray-200 px-2 py-2 text-center ${
                                    day.isWeekend ? "bg-gray-50" : ""
                                  } ${day.isToday ? "bg-amber-50/40" : ""}`}
                                >
                                  {status === "present" && (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
                                      ✓
                                    </span>
                                  )}
                                  {status === "absent" && (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-[10px] font-medium">
                                      ✗
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border-r border-t border-gray-200 px-2 py-2 text-center text-gray-700">
                              {workingDays}
                            </td>
                            <td className="border-r border-t border-gray-200 px-2 py-2 text-center text-gray-700">
                              {came}
                            </td>
                            <td className="border-t border-gray-200 px-2 py-2 text-center text-gray-700">
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
            <div className="py-12 text-center text-gray-400 text-sm">
              Teacher work schedule coming soon
            </div>
          )}

          {activeTab === "salary" && (
            <div className="py-12 text-center text-gray-400 text-sm">
              Salary calculation coming soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
};